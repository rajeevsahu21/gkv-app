import { IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @IsBoolean()
  active: boolean;
}
