import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { CreateClassDto } from './create-class.dto';

class Student {
  @IsMongoId()
  _id: string;

  @IsBoolean()
  present: boolean;
}

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsArray()
  @ValidateNested()
  @Type(() => Student)
  students: Student[];
}
