import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { DeleteResult, Model } from 'mongoose';
import { Queue } from 'bullmq';

import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
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

    const courseStudent = course?.students;
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
      (Boolean(student.present) ? mark : unMark).push(student._id);
    });
    await Promise.all([
      this.classModel.updateOne({ _id: id }, { $addToSet: { students: mark } }),
      this.classModel.updateOne({ _id: id }, { $pull: { students: unMark } }),
    ]);
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
}
