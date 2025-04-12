import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { Course } from './course.model';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ClassesService } from '../classes/classes.service';
import { MessagesService } from '../messages/messages.service';
import { IUser } from '../common/interfaces/request';
import { EnrollDto } from './dto/enroll.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    private messagesService: MessagesService,
    private classesService: ClassesService,
    @InjectQueue('course') private courseQueue: Queue,
  ) {}

  async create(createCourseDto: CreateCourseDto, userId: string) {
    const { courseName } = createCourseDto;
    const courseCode = this.generateCourseCode(6);
    return this.courseModel.create({
      courseName,
      courseCode,
      teacher: userId,
    });
  }

  find(filter: { students?: string; teacher?: string }) {
    return this.courseModel.find(filter);
  }

  findOne(filter: { _id?: string; students?: string; activeClass?: boolean }) {
    return this.courseModel.findOne(filter).lean();
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, user: IUser) {
    const { courseName, students, toggle } = updateCourseDto;
    let update: any = {
      $pull: { students: user._id },
    };
    if (user.role === 'teacher') {
      update = {
        $pull: { students: { $in: students } },
        isActive: toggle,
        courseName,
      };
    }
    const updateCourse = await this.courseModel.findOneAndUpdate(
      { _id: id },
      update,
    );
    if (!updateCourse) {
      throw new NotFoundException('Course not found');
    }

    return {
      message:
        students?.length || user.role == 'student'
          ? 'Student removed successfully'
          : 'Course updated successfully',
    };
  }

  updateOne(filter: { _id: string }, update: { activeClass: boolean }) {
    return this.courseModel.updateOne(filter, update);
  }

  async enroll({ courseCode }: EnrollDto, studentId: string) {
    const course = await this.courseModel.findOne(
      { courseCode },
      { isActive: 1, students: 1 },
    );
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (!course.isActive) {
      throw new BadRequestException('Course closed for enrollment');
    }
    if (course.students.some((id) => id.toString() === studentId)) {
      throw new ConflictException('Student already enrolled');
    }
    await course.updateOne({ $addToSet: { students: studentId } });
  }

  async sendAttendance(courseId: string) {
    const course = await this.courseModel.findOne({ _id: courseId });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    const classes = await this.classesService.findOne({ courseId });
    if (!classes) {
      throw new NotFoundException('No Classes found');
    }
    await this.courseQueue.add(
      'course',
      { courseId },
      { deduplication: { id: courseId } },
    );

    return { message: 'Attendance sent successfully to registered Email' };
  }

  async findOneAndDelete(filter: { _id: string }) {
    const deletedCourse = await this.courseModel.findOneAndDelete(filter);
    if (!deletedCourse) {
      throw new NotFoundException('Course not found');
    }
    await this.classesService.deleteMany({ courseId: filter._id });
    await this.messagesService.deleteMany({ courseId: filter._id });
  }

  generateCourseCode(count: number) {
    const chars = 'acdefhiklmnoqrstuvwxyz0123456789'.split('');
    let result = '';
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * chars.length);
      result += chars[x];
    }
    return result;
  }
}
