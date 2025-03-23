import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';

import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { IdDto } from '../common/dto/id.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/user.model';

@Controller('course')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles(Role.Teacher)
  @Post()
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() req: { user: { _id: string } },
  ) {
    const data = await this.coursesService.create(
      createCourseDto,
      req.user._id,
    );
    return { data, message: 'Course Created successfully' };
  }

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  findOne(@Param() idDto: IdDto) {
    return this.coursesService.findOne({ _id: idDto.id });
  }

  @Patch(':id')
  update(@Param() idDto: IdDto, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(idDto.id, updateCourseDto);
  }

  @Delete(':id')
  remove(@Param() idDto: IdDto) {
    return this.coursesService.remove(idDto.id);
  }
}
