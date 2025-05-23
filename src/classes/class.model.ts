import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ClassDocument = HydratedDocument<Class>;

@Schema({ _id: false })
export class Location {
  @Prop({ type: Number, required: true })
  longitude: number;

  @Prop({ type: Number, required: true })
  latitude: number;
}

@Schema({ timestamps: true })
export class Class {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Course' })
  courseId: mongoose.Types.ObjectId;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  students: mongoose.Types.ObjectId[];

  @Prop({ type: Location, required: true })
  location: Location;

  @Prop({ type: Number, default: 50 })
  radius: number;

  @Prop({ type: Boolean, default: true })
  active: boolean;
}

export const ClassSchema = SchemaFactory.createForClass(Class);

ClassSchema.index(
  { courseId: 1, active: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'unique_active_class_per_course',
  },
);
