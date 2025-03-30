import { Controller, Get, Body, Put, Req, Query } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import { ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { IRequest } from '../common/interfaces/request';
import { CoursesService } from '../courses/courses.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from './user.model';

@ApiBearerAuth()
@Controller('user')
export class UsersController {
  private readonly version: string;
  constructor(
    private readonly usersService: UsersService,
    private readonly coursesService: CoursesService,
  ) {
    const packageJsonPath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    this.version = packageJson.version;
  }

  @Get('me')
  create(@Req() req: IRequest) {
    return {
      version: this.version,
      message: 'User Found Successfully',
      data: req.user,
    };
  }

  @Roles(Role.Admin)
  @Get()
  async findAll(
    @Query() query: { pageNumber: number; limit: number; searchTerm: string },
  ) {
    const { pageNumber = 1, limit = 15, searchTerm = '' } = query;
    const skip = (pageNumber - 1) * limit;
    const filter = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { registrationNo: { $regex: searchTerm, $options: 'i' } },
      ],
      role: { $ne: 'admin' },
    };
    const total = await this.usersService.countDocuments(filter);
    const users = await this.usersService
      .find(filter, { password: 0, token: 0 })
      .skip(skip)
      .limit(limit);
    return {
      total,
      pageCount: Math.ceil(total / limit),
      data: users,
      status: 'success',
      message: 'Users found Successfully',
    };
  }

  @Roles(Role.Admin)
  @Get('courses')
  async getUserCourses(@Query() query: { userId: string; role: string }) {
    const { userId, role } = query;
    let filter: any = {
      students: userId,
    };
    if (role === 'teacher') {
      filter = {
        teacher: userId,
      };
    }
    const courses = await this.coursesService.find(filter);
    return { data: courses, message: 'Courses Found Successfully' };
  }

  @Put('')
  async update(@Body() updateUserDto: UpdateUserDto, @Req() req: IRequest) {
    await this.usersService.updateOne({ _id: req.user._id }, updateUserDto);
    return { message: 'User Profile Updated successfully' };
  }

  @Roles(Role.Admin)
  @Put('detail')
  async updateUsers(
    @Body() body: { userId: string; name: string; email: string; role: string },
  ) {
    const { userId, name, email, role } = body;
    const user = await this.usersService.findOneAndUpdate(
      { _id: userId },
      { name, email, role },
    );
    return { message: 'User Profile Updated Successfully' };
  }
}
