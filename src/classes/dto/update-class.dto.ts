import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

import { CreateClassDto } from './create-class.dto';
import { Type } from 'class-transformer';

class Student {
  @IsMongoId()
  _id: string;

  @IsBoolean()
  present: boolean;
}

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @IsOptional()
  @IsBoolean()
  active: boolean;

  @IsArray()
  @ValidateNested()
  @Type(() => Student)
  students: Student[];
}
