import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.model';
import { IdDto } from '../common/dto/id.dto';

@ApiBearerAuth()
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param() idDto: IdDto) {
    return this.usersService.findOneOrThrow({ _id: idDto.id });
  }

  @Put(':id')
  update(@Param() idDto: IdDto, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(idDto.id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param() idDto: IdDto) {
    return this.usersService.remove(idDto.id);
  }
}
