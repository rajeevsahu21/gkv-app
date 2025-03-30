import { IsMongoId } from 'class-validator';

export class CourseDto {
  @IsMongoId()
  courseId: string;
}
