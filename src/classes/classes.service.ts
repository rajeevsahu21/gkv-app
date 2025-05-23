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
    try {
      await this.classModel.create({ courseId, location, radius });
      await Promise.all([
        this.coursesService.updateOne(
          { _id: courseId },
          { activeClass: true, radius },
        ),
        this.classQueue.add(
          'close',
          { courseId },
          { delay: 300000, deduplication: { id: courseId } },
        ),
      ]);
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Already Have a running class');
      }
      throw error;
    }
  }

  find(filter: { courseId: string; students?: string; createdAt?: any }) {
    return this.classModel.find(filter);
  }

  findOne(filter: { _id?: string; courseId?: string }) {
    return this.classModel.findOne(filter);
  }

  async getClassWithStudents(classId: string) {
    const result = await this.classModel
      .aggregate([
        {
          $match: { _id: new Types.ObjectId(classId) },
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
            pipeline: [
              {
                $lookup: {
                  from: 'users',
                  localField: 'students',
                  foreignField: '_id',
                  as: 'students',
                  pipeline: [
                    {
                      $project: {
                        registrationNo: 1,
                        name: 1,
                      },
                    },
                  ],
                },
              },
              {
                $project: {
                  students: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: '$course',
        },
        {
          $project: {
            students: '$students',
            courseStudents: '$course.students',
          },
        },
      ])
      .exec();

    if (!result || result.length === 0) {
      throw new NotFoundException('Class not found');
    }

    const { students: classStudents, courseStudents } = result[0];

    // Convert class students array to Set for O(1) lookup performance
    const classStudentIds = new Set(
      classStudents.map((user: { _id: string }) => user._id.toString()),
    );

    // Process and sort students efficiently
    const data = courseStudents
      .map((student: any) => ({
        ...student,
        present: classStudentIds.has(student._id.toString()),
      }))
      .sort((a: any, b: any) => +a.registrationNo - +b.registrationNo);
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
      this.classModel.updateOne(
        { _id: id },
        { $pull: { students: { $in: unMark } } },
      ),
    ]);
  }

  async updateClass(
    { courseId, location }: MarkAttendanceDto,
    user: { _id: string; role: string },
  ) {
    if (user.role === 'teacher') {
      const oldClass = await Promise.all([
        this.classModel.findOneAndUpdate(
          { courseId, active: true },
          { active: false },
        ),
        this.coursesService.updateOne(
          { _id: courseId },
          { activeClass: false },
        ),
      ]);
      if (!oldClass) {
        throw new NotFoundException('No running Class found');
      }
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

    if (
      runningClass.students.some((id) => id.toString() === studentId.toString())
    ) {
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
      { _id: runningClass._id },
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

    // Radius of earth in kilometers. Use 3956 for miles
    const r = 6371;

    // calculate the result in meter
    return c * r * 1000;
  }
}
