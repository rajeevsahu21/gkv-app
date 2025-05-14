import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationService {
  constructor(@InjectQueue('notification') private notificationQueue: Queue) {}

  addEmailJob(jobData: {
    subject: string;
    to: string | string[];
    body: object;
    templateName: string;
    filePath?: string;
  }) {
    return this.notificationQueue.add('email', jobData);
  }
}
