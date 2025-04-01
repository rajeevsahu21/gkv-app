import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { IdDto } from '../common/dto/id.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/user.model';
import { CourseDto } from '../courses/dto/course.dto';
import { IRequest } from '../common/interfaces/request';
import { MarkAttendanceDto } from './dto/markAttendance.dto';
import { ClassDto } from './dto/class.dto';

@ApiBearerAuth()
@Controller('class')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Roles(Role.Teacher)
  @Post()
  async create(@Body() createClassDto: CreateClassDto) {
    await this.classesService.create(createClassDto);
    return { message: 'Class Started successfully' };
  }

  @Get()
  async findAll(@Query() { courseId }: CourseDto, @Req() req: IRequest) {
    const filter =
      req.user.role === 'student'
        ? { students: req.user._id, courseId }
        : { courseId };
    const classes = this.classesService.find(filter);
    const data = await classes.sort({ createdAt: -1 });
    return { message: `Available classes found: ${data.length}`, data };
  }

  @Roles(Role.Teacher)
  @Get('students')
  async getClassWithStudents(@Query() { classId }: ClassDto) {
    return this.classesService.getClassWithStudents(classId);
  }

  @Roles(Role.Teacher)
  @Get(':id')
  async findOne(@Param() idDto: IdDto) {
    const cls = this.classesService.findOne({ _id: idDto.id });
    const data = await cls.populate('students', 'name registrationNo');
    if (!data) {
      throw new NotFoundException('Class not found');
    }
    return {
      message: `${data.students.length} student found`,
      data,
    };
  }

  @Put()
  updateClass(
    @Body() markAttendanceDto: MarkAttendanceDto,
    @Req() req: IRequest,
  ) {
    return this.classesService.updateClass(markAttendanceDto, req.user);
  }

  @Roles(Role.Teacher)
  @Put(':id')
  async update(@Param() idDto: IdDto, @Body() updateClassDto: UpdateClassDto) {
    await this.classesService.update(idDto.id, updateClassDto);
    return { message: 'Attendance updated Successfully' };
  }

  @Roles(Role.Teacher)
  @Delete(':id')
  async remove(@Param() idDto: IdDto) {
    await this.classesService.findOneAndDelete({ _id: idDto.id });
    return { message: 'Class deleted successfully' };
  }
}
