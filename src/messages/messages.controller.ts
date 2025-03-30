import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { IdDto } from '../common/dto/id.dto';
import { CourseDto } from '../courses/dto/course.dto';

@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async create(@Body() createMessageDto: CreateMessageDto) {
    await this.messagesService.create(createMessageDto);
    return { message: 'Message Send successfully' };
  }

  @Get()
  async findAll(@Query() courseDto: CourseDto) {
    const data = await this.messagesService.find({
      courseId: courseDto.courseId,
    });
    return { message: 'All Messages found', total: data.length, data };
  }

  @Get(':id')
  async findOne(@Param() idDto: IdDto) {
    const data = await this.messagesService.findOne({ _id: idDto.id });
    return { message: 'Message Found successfully', data };
  }

  @Put(':id')
  async update(
    @Param() idDto: IdDto,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    await this.messagesService.update(idDto.id, updateMessageDto);
    return { message: 'Message Updated successfully' };
  }

  @Delete(':id')
  async remove(@Param() idDto: IdDto) {
    await this.messagesService.remove(idDto.id);
    return { message: 'Message deleted successfully' };
  }
}
