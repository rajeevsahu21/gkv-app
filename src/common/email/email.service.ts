import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  addJob(jobData: {
    subject: string;
    to: string;
    body: object;
    templateName: string;
    filePath?: string;
  }) {
    return this.emailQueue.add('email', jobData);
  }
}
