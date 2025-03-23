import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { Class, ClassSchema } from './class.model';
import { ClassesProcessor } from './classes.processor';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Class.name, schema: ClassSchema }]),
    BullModule.registerQueue({ name: 'class' }),
    BullBoardModule.forFeature({
      name: 'class',
      adapter: BullMQAdapter,
    }),
    CoursesModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService, ClassesProcessor],
})
export class ClassesModule {}
