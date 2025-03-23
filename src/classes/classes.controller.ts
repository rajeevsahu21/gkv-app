import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { IdDto } from '../common/dto/id.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/user.model';

@Controller('class')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Roles(Role.Teacher)
  @Post()
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  findOne(@Param() idDto: IdDto) {
    return this.classesService.findOne(idDto.id);
  }

  @Patch(':id')
  update(@Param() idDto: IdDto, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(idDto.id, updateClassDto);
  }

  @Delete(':id')
  remove(@Param() idDto: IdDto) {
    return this.classesService.remove(idDto.id);
  }
}
