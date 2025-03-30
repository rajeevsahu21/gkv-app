import { PartialType } from '@nestjs/swagger';

import { CreateCourseDto } from './create-course.dto';
import { IsArray, IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  students: string[];

  @IsOptional()
  @IsBoolean()
  toggle: boolean;
}
