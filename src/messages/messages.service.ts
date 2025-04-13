import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeleteResult, Model } from 'mongoose';

import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { Message } from './message.model';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  create(createMessageDto: CreateMessageDto) {
    return this.messageModel.create(createMessageDto);
  }

  find(filter: { courseId: string }) {
    return this.messageModel.find(filter);
  }

  async findOneOrThrow(filter: { _id: string }) {
    const message = await this.messageModel.findOne(filter);
    if (!message) {
      throw new NotFoundException('Message Not Found');
    }
    return message;
  }

  async update(id: string, update: UpdateMessageDto) {
    const message = await this.messageModel.findOneAndUpdate(
      { _id: id },
      update,
    );
    if (!message) {
      throw new NotFoundException('Message Not Found');
    }
  }

  async remove(id: string) {
    const message = await this.messageModel.findOneAndDelete({ _id: id });
    if (!message) {
      throw new NotFoundException('Message Not Found');
    }
  }

  deleteMany(filter: { courseId: string }): Promise<DeleteResult> {
    return this.messageModel.deleteMany(filter);
  }
}
