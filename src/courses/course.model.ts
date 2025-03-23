import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type CourseDocument = HydratedDocument<Course>;

@Schema({ timestamps: true })
export class Course {
  @Prop({ type: String, required: true, trim: true })
  courseName: string;

  @Prop({ type: String, required: true, unique: true })
  courseCode: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' })
  teacher: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId })
  students: mongoose.Types.ObjectId[];

  @Prop({ type: Number, default: 50 })
  radius: number;

  @Prop({ type: Boolean, default: false })
  activeClass: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
