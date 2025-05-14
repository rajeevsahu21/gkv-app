import { Processor, WorkerHost } from '@nestjs/bullmq';
import { createTransport, Transporter } from 'nodemailer';
import { Job } from 'bullmq';
import { join } from 'path';
import { compile } from 'handlebars';
import { readFileSync } from 'fs';

@Processor('notification', { concurrency: 10 })
export class NotificationProcessor extends WorkerHost {
  private readonly transporter: Transporter;
  constructor() {
    super();
    this.transporter = createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER_NAME,
        pass: process.env.SMTP_USER_PASSWORD,
      },
    });
  }
  async process(
    job: Job<{
      subject: string;
      to: string | string[];
      body: object;
      templateName: string;
      filePath?: string;
    }>,
  ) {
    switch (job.name) {
      case 'email':
        return this.sendEmail(job.data);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  async sendEmail(jobData: {
    subject: string;
    to: string | string[];
    body: object;
    templateName: string;
    filePath?: string;
  }) {
    const { subject, to, body, templateName, filePath } = jobData;
    const templatePath = join(
      process.cwd(),
      'public',
      'templates',
      `${templateName}.html`,
    );
    const source = readFileSync(templatePath, 'utf8');
    const template = compile(source);
    const html = template(body);
    const mailOptions: any = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to,
      subject,
      html,
    };
    if (filePath) {
      mailOptions.attachments = [{ path: filePath }];
    }

    await this.transporter.sendMail(mailOptions);
    return {
      message: 'Email send successfully',
    };
  }
}
