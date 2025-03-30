import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { utils, writeFile } from 'xlsx';

import { CoursesService } from './courses.service';
import { ClassesService } from '../classes/classes.service';
import { EmailService } from '../common/email/email.service';

@Processor('course', { concurrency: 10 })
export class CoursesProcessor extends WorkerHost {
  constructor(
    private coursesService: CoursesService,
    private classesService: ClassesService,
    private emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<{ courseId: string }, any, string>): Promise<any> {
    const { courseId } = job.data;
    const course = await this.coursesService
      .findOne({ _id: courseId })
      .populate('students', 'name registrationNo')
      .populate('teacher', 'email');
    if (!course) return;

    const classes = await this.classesService.find({ courseId });
    const classesDates = classes.map((cls: any) =>
      cls.createdAt.toLocaleDateString('pt-PT'),
    );
    const workSheetColumnName = [
      'Registration No',
      'Student Name',
      ...classesDates,
    ];
    let userList: any[] = [];
    course.students?.forEach((user: any) => {
      let d = [user.registrationNo, user.name];
      classes.forEach((cls) => {
        d = cls.students.find((stu) => stu.toString() === user._id.toString())
          ? [...d, 'P']
          : [...d, ''];
      });
      userList.push(d);
    });

    const workSheetName = 'students';
    const filePath = `./${course.courseName}.xlsx`;
    const wb = utils.book_new();
    const workSheetData = [workSheetColumnName, ...userList];
    const ws = utils.aoa_to_sheet(workSheetData);
    utils.book_append_sheet(wb, ws, workSheetName);
    await writeFile(wb, filePath);
    await this.emailService.addJob({
      subject: `Course Attendance for ${course.courseName}`,
      to: (course.teacher as any).email,
      body: { COURSE: course.courseName },
      templateName: 'course-attendance',
      filePath,
    });
    return {
      message: 'Attendance Prepared',
    };
  }
}
