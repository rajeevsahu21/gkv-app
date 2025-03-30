import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { ClassesService } from './classes.service';
import { CoursesService } from '../courses/courses.service';

@Processor('class', { concurrency: 10 })
export class ClassesProcessor extends WorkerHost {
  constructor(
    private classesService: ClassesService,
    private coursesService: CoursesService,
  ) {
    super();
  }

  async process(job: Job<{ courseId: string }, any, string>): Promise<any> {
    const { courseId } = job.data;
    await this.classesService.updateOne(
      { courseId, active: true },
      { active: false },
    );
    await this.coursesService.updateOne(
      { _id: courseId },
      { activeClass: false },
    );
    return {
      message: 'Class closed successfully',
    };
  }
}
