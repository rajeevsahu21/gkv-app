import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, CourseSchema } from './course.model';
import { ClassesModule } from '../classes/classes.module';
import { MessagesModule } from '../messages/messages.module';
import { CoursesProcessor } from './courses.processor';
import { NotificationModule } from '../common/notification/notification.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    BullModule.registerQueue({ name: 'course' }),
    BullBoardModule.forFeature({
      name: 'course',
      adapter: BullMQAdapter,
    }),
    forwardRef(() => UsersModule),
    ClassesModule,
    MessagesModule,
    NotificationModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService, CoursesProcessor],
  exports: [CoursesService],
})
export class CoursesModule {}
