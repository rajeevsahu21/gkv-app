import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UploadedFile,
  UseInterceptors,
  Put,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { IdDto } from '../common/dto/id.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/user.model';
import { IRequest } from '../common/interfaces/request';
import { EnrollDto } from './dto/enroll.dto';
import { CourseDto } from './dto/course.dto';

@ApiBearerAuth()
@Controller('course')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles(Role.Teacher)
  @Post()
  async create(@Body() createCourseDto: CreateCourseDto, @Req() req: IRequest) {
    const data = await this.coursesService.create(
      createCourseDto,
      req.user._id,
    );
    return { data, message: 'Course Created successfully' };
  }

  @Get()
  async findAll(@Req() req: IRequest) {
    const filter =
      req.user.role === 'student'
        ? { students: req.user._id }
        : { teacher: req.user._id };
    const courses = this.coursesService.find(filter);
    const data = await courses.sort({ createdAt: -1 });
    return { data, message: 'Available Course found' };
  }

  @Roles(Role.Teacher)
  @Get(':id')
  async findOne(@Param() idDto: IdDto) {
    const course = this.coursesService.findOne({ _id: idDto.id });
    const data = await course.populate('students', 'registrationNo name');
    return { data, message: 'Course Found successfully' };
  }

  @Roles(Role.Student)
  @HttpCode(HttpStatus.OK)
  @Post('enroll')
  async enroll(@Body() enrollDto: EnrollDto, @Req() req: IRequest) {
    await this.coursesService.enroll(enrollDto, req.user._id);
    return { message: 'Course Enrollment Done' };
  }

  @Roles(Role.Teacher)
  @HttpCode(HttpStatus.OK)
  @Post('invite')
  @UseInterceptors(
    FileInterceptor('emails', { dest: './uploads', preservePath: true }),
  )
  async inviteStudents(
    @UploadedFile() file: Express.Multer.File,
    @Body() courseDto: CourseDto,
  ) {
    console.log(file, file.path);
  }

  @Roles(Role.Teacher)
  @HttpCode(HttpStatus.OK)
  @Post('attendance')
  sendAttendance(@Query() courseDto: CourseDto) {
    return this.coursesService.sendAttendance(courseDto.courseId);
  }

  @Put(':id')
  update(
    @Param() idDto: IdDto,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req: IRequest,
  ) {
    return this.coursesService.update(idDto.id, updateCourseDto, req.user);
  }

  @Roles(Role.Teacher)
  @Delete(':id')
  async remove(@Param() idDto: IdDto) {
    await this.coursesService.findOneAndDelete({ _id: idDto.id });
    return { message: 'Course deleted successfully' };
  }
}
