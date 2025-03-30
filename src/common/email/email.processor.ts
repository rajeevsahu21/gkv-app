import { Processor, WorkerHost } from '@nestjs/bullmq';
import { createTransport, Transporter } from 'nodemailer';
import { Job } from 'bullmq';
import { join } from 'path';
import { compile } from 'handlebars';
import { readFileSync } from 'fs';

@Processor('email', { concurrency: 10 })
export class EmailProcessor extends WorkerHost {
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
      to: string;
      body: object;
      templateName: string;
      filePath?: string;
    }>,
  ): Promise<any> {
    const { subject, to, body, templateName, filePath } = job.data;
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
