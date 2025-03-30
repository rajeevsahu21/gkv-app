import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.model';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  create(createUserDto: CreateUserDto) {
    return this.userModel.create(createUserDto);
  }

  find(filter: object, projection: Object) {
    return this.userModel.find(filter, projection).lean();
  }

  findOne(filter: {
    email?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: object;
  }) {
    return this.userModel.findOne(filter).lean();
  }

  async findOneOrThrow(
    filter: { _id?: string; email?: string },
    message = 'User not found',
  ) {
    const user = await this.userModel.findOne(filter).lean();
    if (!user) {
      throw new NotFoundException(message);
    }
    return user;
  }

  countDocuments(filter: object) {
    return this.userModel.countDocuments(filter);
  }

  updateOne(
    filter: { _id?: string; email?: string },
    update: {
      name?: string;
      gId?: string;
      profileImage?: string;
      status?: string;
      token?: string;
    },
  ) {
    return this.userModel.updateOne(filter, update);
  }

  findOneAndUpdate(
    filter: {
      _id?: string;
      email?: string;
      confirmationCode?: string;
      resetPasswordExpires?: object;
      resetPasswordToken?: string;
    },
    update: {
      name?: string;
      email?: string;
      role?: string;
      status?: string;
      password?: string;
      resetPasswordToken?: string;
      resetPasswordExpires?: number;
      lastActivityAt?: Date;
    },
  ) {
    return this.userModel.findOneAndUpdate(filter, update);
  }
}
