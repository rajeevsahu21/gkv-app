import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { DeleteResult, Model, Types } from 'mongoose';
import { Queue } from 'bullmq';

import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { MarkAttendanceDto } from './dto/markAttendance.dto';
import { CoursesService } from '../courses/courses.service';
import { Class } from './class.model';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<Class>,
    @Inject(forwardRef(() => CoursesService))
    private readonly coursesService: CoursesService,
    @InjectQueue('class') private classQueue: Queue,
  ) {}

  async create(createClassDto: CreateClassDto) {
    const { courseId, location, radius } = createClassDto;
    if (
      await this.classModel
        .findOne({ courseId, active: true }, { _id: 1 })
        .lean()
    ) {
      throw new BadRequestException('Already Have a running class');
    }

    await this.classModel.create({ courseId, location, radius });
    await Promise.all([
      this.coursesService.updateOne({ _id: courseId }, { activeClass: true }),
      this.classQueue.add(
        'class',
        { courseId },
        { delay: 300000, deduplication: { id: courseId } },
      ),
    ]);
  }

  find(filter: { courseId: string; students?: string }) {
    return this.classModel.find(filter);
  }

  findOne(filter: { _id?: string; courseId?: string }) {
    return this.classModel.findOne(filter);
  }

  async getClassWithStudents(classId: string) {
    const cls = await this.classModel.findOne({ _id: classId });
    if (!cls) {
      throw new NotFoundException('Class not found');
    }
    const course = await this.coursesService
      .findOne({ _id: cls.courseId.toString() })
      .populate('students', 'registrationNo name');

    const courseStudent = course?.students.sort(
      (a, b) => +(a as any).registrationNo - +(b as any).registrationNo,
    );
    const classStudent = cls.students;
    const data: any[] = [];
    courseStudent?.forEach((student: any) => {
      student.present = classStudent.includes(student._id);
      data.push(student);
    });
    return { message: 'Student Attendance found', data };
  }

  async update(id: string, { students }: UpdateClassDto) {
    const mark: string[] = [],
      unMark: string[] = [];
    students.forEach((student) => {
      (student.present ? mark : unMark).push(student._id);
    });
    await Promise.all([
      this.classModel.updateOne({ _id: id }, { $addToSet: { students: mark } }),
      this.classModel.updateOne({ _id: id }, { $pull: { students: unMark } }),
    ]);
  }

  async updateClass(
    { courseId, location }: MarkAttendanceDto,
    user: { _id: string; role: string },
  ) {
    if (user.role === 'teacher') {
      const oldClass = await this.classModel.findOneAndUpdate(
        { courseId, active: true },
        { active: false },
      );
      if (!oldClass) {
        throw new NotFoundException('No running Class found');
      }
      await this.coursesService.updateOne(
        { _id: courseId },
        { activeClass: false },
      );
      return { message: 'Class dismissed successfully' };
    }
    if (!location) {
      throw new BadRequestException('Required field is missing');
    }
    const studentId = user._id;
    const runningClass = await this.classModel.findOne({
      courseId,
      active: true,
    });
    if (!runningClass) {
      throw new NotFoundException('No running class found');
    }
    const classId = runningClass._id;
    if (runningClass.students.some((id) => id.toString() === studentId)) {
      throw new BadRequestException('Student already marked Attendance');
    }
    const distance = this.calculateDistance(
      runningClass.location.latitude,
      location.latitude,
      runningClass.location.longitude,
      location.longitude,
    );
    if (distance > runningClass.radius) {
      throw new BadRequestException('You are too far from class');
    }
    await this.classModel.updateOne(
      { _id: classId },
      {
        $addToSet: { students: studentId },
      },
    );
    return { message: 'Class Attendance marked successfully' };
  }

  updateOne(
    filter: { courseId: string; active: boolean },
    update: { active: boolean },
  ) {
    return this.classModel.updateOne(filter, update);
  }

  async findOneAndDelete(filter: { _id: string }) {
    const deletedClass = await this.classModel.findOneAndDelete(filter);

    if (!deletedClass) {
      throw new NotFoundException('Class not found');
    }

    if (deletedClass.active) {
      await this.coursesService.updateOne(
        { _id: deletedClass.courseId.toString() },
        { activeClass: false },
      );
    }
  }

  deleteMany(filter: { courseId: string }): Promise<DeleteResult> {
    return this.classModel.deleteMany(filter);
  }

  private calculateDistance(
    lat1: number,
    lat2: number,
    lon1: number,
    lon2: number,
  ) {
    // degrees to radians.
    lon1 = (lon1 * Math.PI) / 180;
    lon2 = (lon2 * Math.PI) / 180;
    lat1 = (lat1 * Math.PI) / 180;
    lat2 = (lat2 * Math.PI) / 180;

    // Haversine formula
    const dlon = lon2 - lon1;
    const dlat = lat2 - lat1;
    const a =
      Math.pow(Math.sin(dlat / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);

    const c = 2 * Math.asin(Math.sqrt(a));

    // Radius of earth in kilometers. Use 3956
    // for miles
    const r = 6371;

    // calculate the result in meter
    return c * r * 1000;
  }
}
