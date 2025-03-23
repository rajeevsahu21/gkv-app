import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { IdDto } from '../common/dto/id.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get()
  findAll() {
    return this.messagesService.findAll();
  }

  @Get(':id')
  findOne(@Param() idDto: IdDto) {
    return this.messagesService.findOne(idDto.id);
  }

  @Patch(':id')
  update(@Param() idDto: IdDto, @Body() updateMessageDto: UpdateMessageDto) {
    return this.messagesService.update(idDto.id, updateMessageDto);
  }

  @Delete(':id')
  remove(@Param() idDto: IdDto) {
    return this.messagesService.remove(idDto.id);
  }
}
