import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { readFile, utils, writeFile } from 'xlsx';

import { CoursesService } from './courses.service';
import { ClassesService } from '../classes/classes.service';
import { NotificationService } from '../common/notification/notification.service';
import { UsersService } from '../users/users.service';

@Processor('course', { concurrency: 10 })
export class CoursesProcessor extends WorkerHost {
  constructor(
    private coursesService: CoursesService,
    private classesService: ClassesService,
    private notificationService: NotificationService,
    private usersService: UsersService,
  ) {
    super();
  }

  async process(
    job: Job<{ courseId: string; filePath?: string }, any, string>,
  ) {
    const { courseId } = job.data;

    switch (job.name) {
      case 'invite':
        return this.inviteStudents(courseId, job.data.filePath);
      case 'attendance':
        return this.sendAttendance(courseId);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  async inviteStudents(courseId: string, filePath?: string) {
    const workbook = readFile(filePath as string);
    const wsnames = workbook.SheetNames;
    const worksheet = workbook.Sheets[wsnames[0]];
    const length = +(worksheet as any)['!ref'].split(':')[1].substring(1);
    const newUsers = [];
    const oldUsers = [];
    for (let i = 1; i <= length; i++) {
      const email = worksheet[`A${i}`].v.replace(/\s/g, '').toLowerCase();
      if (worksheet[`A${i}`] && /^\d{8,9}@gkv\.ac\.in$/.test(email)) {
        const name = worksheet[`B${i}`]?.v;
        const parentEmail = worksheet[`C${i}`]?.v;
        const parentPhone = worksheet[`D${i}`]?.v;
        const oldUser = await this.usersService.findOneAndUpdate(
          { email },
          { name, parentEmail, parentPhone },
        );
        if (oldUser) {
          oldUsers.push(oldUser);
        } else {
          const newUser = await this.usersService.create({
            email,
            name,
            role: 'student',
            parentEmail,
            parentPhone,
            registrationNo: email.split('@')[0],
          } as any);
          newUsers.push(newUser);
          await this.notificationService.addEmailJob({
            subject: 'Account Created',
            to: newUser.email,
            body: { NAME: newUser.name || 'There' },
            templateName: 'account-creation',
          });
        }
      }
    }
    const allUsers = [...oldUsers, ...newUsers];
    const studentIds = allUsers.map((student) => student._id);
    const course = await this.coursesService
      .findOne({ _id: courseId })
      .populate('teacher', 'name');
    if (!course) {
      return;
    }
    await course.updateOne({ $addToSet: { students: studentIds } });
    const emails = allUsers.map((user) => user.email);
    await this.notificationService.addEmailJob({
      subject: `Course Invitation for ${course.courseName}`,
      to: emails,
      body: {
        COURSE: course.courseName,
        TEACHER: (course.teacher as any).name,
      },
      templateName: 'course-invite',
    });
    return {
      message: 'students invited',
    };
  }

  async sendAttendance(courseId: string) {
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
      'Attendance %',
    ];
    const userList: any[] = [];
    course.students
      .sort((a, b) => +(a as any).registrationNo - +(b as any).registrationNo)
      ?.forEach((user: any) => {
        const d = [user.registrationNo, user.name];
        let presentCount = 0;
        classes.forEach((cls) => {
          const isPresent = cls.students.find(
            (stu) => stu.toString() === user._id.toString(),
          );
          if (isPresent) {
            d.push('P');
            presentCount++;
          } else {
            d.push('');
          }
        });
        const attendancePercentage = (
          (presentCount / classes.length) *
          100
        ).toFixed(2);
        d.push(`${attendancePercentage}%`);
        userList.push(d);
      });

    const workSheetName = 'students';
    const filePath = `./${course.courseName}.xlsx`;
    const wb = utils.book_new();
    const workSheetData = [workSheetColumnName, ...userList];
    const ws = utils.aoa_to_sheet(workSheetData);
    utils.book_append_sheet(wb, ws, workSheetName);
    await writeFile(wb, filePath);
    await this.notificationService.addEmailJob({
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
