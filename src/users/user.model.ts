import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum Role {
  Teacher = 'teacher',
  Admin = 'admin',
  Student = 'student',
}

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^@]+@[^@]+\.[^@]+$/,
  })
  email: string;

  @Prop({ type: String, required: true, trim: true, minlength: 3 })
  name: string;

  @Prop({ type: String })
  gId: string;

  @Prop({ type: String })
  registrationNo: string;

  @Prop({
    type: String,
    enum: Object.values(Role),
    default: 'student',
  })
  role: string;

  @Prop({
    type: String,
    enum: ['pending', 'active'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: String })
  profileImage: string;

  @Prop({ type: String })
  parentEmail: string;

  @Prop({ type: String })
  parentPhone: string;

  @Prop({ type: String })
  token: string;

  @Prop({ type: String, unique: true })
  confirmationCode: string;

  @Prop({ type: String })
  resetPasswordToken: string;

  @Prop({ type: Date })
  resetPasswordExpires: Date;

  @Prop({ type: Date })
  lastActivityAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
