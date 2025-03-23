import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';

import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Class } from './class.model';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<Class>,
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
    return { message: 'Class Started successfully' };
  }

  async findAll() {
    const data = await this.classModel
      .find()
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();
    return { message: `Available classes found: ${data.length}`, data };
  }

  findOne(id: string) {
    return this.classModel.findOne({ _id: id });
  }

  update(id: string, updateClassDto: UpdateClassDto) {
    return this.classModel.updateOne({ _id: id }, updateClassDto);
  }

  updateOne(
    filter: { courseId: string; active: boolean },
    update: { active: boolean },
  ) {
    return this.classModel.updateOne(filter, update);
  }

  async remove(id: string) {
    const deletedClass = await this.classModel.findOneAndDelete({ _id: id });

    if (!deletedClass) {
      throw new NotFoundException('Class not found');
    }

    if (deletedClass.active) {
      await this.coursesService.updateOne(
        { _id: deletedClass.courseId.toString() },
        { activeClass: false },
      );
    }

    return { message: 'Class deleted successfully' };
  }
}
