import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';

import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.model';
import { CoursesService } from '../courses/courses.service';
import { ClassesService } from '../classes/classes.service';
import { NotificationService } from '../common/notification/notification.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly coursesService: CoursesService,
    private readonly classesService: ClassesService,
    private readonly notificationService: NotificationService,
  ) {}

  create(createUserDto: CreateUserDto) {
    return this.userModel.create(createUserDto);
  }

  find(filter: object, projection: object) {
    return this.userModel.find(filter, projection).lean();
  }

  findOne(filter: {
    email?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: object;
  }) {
    return this.userModel.findOne(filter).lean();
  }

  async findOneOrThrow(
    filter: { _id?: string; email?: string },
    message = 'User not found',
  ) {
    const user = await this.userModel.findOne(filter).lean();
    if (!user) {
      throw new NotFoundException(message);
    }
    return user;
  }

  countDocuments(filter: object) {
    return this.userModel.countDocuments(filter);
  }

  updateOne(
    filter: { _id?: string; email?: string },
    update: {
      name?: string;
      gId?: string;
      profileImage?: string;
      status?: string;
      token?: string;
    },
  ) {
    return this.userModel.updateOne(filter, update);
  }

  findOneAndUpdate(
    filter: {
      _id?: string;
      email?: string;
      confirmationCode?: string;
      resetPasswordExpires?: object;
      resetPasswordToken?: string;
    },
    update: {
      name?: string;
      email?: string;
      role?: string;
      status?: string;
      password?: string;
      resetPasswordToken?: string;
      resetPasswordExpires?: number;
      lastActivityAt?: Date;
      parentEmail?: string;
      parentPhone?: string;
      $unset?: object;
    },
  ) {
    return this.userModel.findOneAndUpdate(filter, update);
  }

  @Cron('0 18 * * 1,2,3,4,5,6')
  async sendDailyAttendanceReports() {
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Find all students
    const students = await this.userModel
      .find({
        role: 'student',
        status: 'active',
        parentEmail: { $exists: true },
      })
      .lean();

    for (const student of students) {
      // Skip if parent email is invalid
      if (
        !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
          student.parentEmail,
        )
      ) {
        continue;
      }
      const missedClasses = [];

      // Find courses for this student
      const courses = await this.coursesService
        .find({
          students: student._id.toString(),
        })
        .lean();
      for (const course of courses) {
        // Find classes for this course that happened today
        const classes = await this.classesService
          .find({
            courseId: course._id.toString(),
            createdAt: {
              $gte: currentDate,
              $lt: endOfDay,
            },
          })
          .lean();

        // Check if student missed any classes
        for (const classItem of classes) {
          if (!classItem.students.includes(student._id)) {
            missedClasses.push(course.courseName);
            break; // Only count each course once
          }
        }
      }

      // Send email if the student missed classes
      if (missedClasses.length > 0) {
        await this.notificationService.addEmailJob({
          subject: 'Attendence Report of your child',
          to: student.parentEmail,
          body: { NAME: student.name, MISSEDCOURSES: missedClasses },
          templateName: 'attendance-report',
        });
      }
    }
  }
}
