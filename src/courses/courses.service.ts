import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Course } from './course.model';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(@InjectModel(Course.name) private courseModel: Model<Course>) {}

  async create(createCourseDto: CreateCourseDto, userId: string) {
    const { courseName } = createCourseDto;
    const courseCode = this.generateCourseCode(6);
    return this.courseModel.create({
      courseName,
      courseCode,
      teacher: userId,
    });
  }

  findAll() {
    const data = this.courseModel.find().sort({ createdAt: -1 });
    return { data, message: 'Available Course found' };
  }

  findOne(filter: { _id?: string; students?: string; activeClass?: boolean }) {
    return this.courseModel.findOne(filter);
  }

  find(filter: { students: string }) {
    return this.courseModel.find(filter);
  }

  update(id: string, updateCourseDto: UpdateCourseDto) {
    return `This action updates a #${id} course ${updateCourseDto.courseName}`;
  }

  updateOne(filter: { _id: string }, update: { activeClass: boolean }) {
    return this.courseModel.updateOne(filter, update);
  }

  async remove(id: string) {
    await this.courseModel.deleteOne({ _id: id });
    return { message: 'Course deleted successfully' };
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
