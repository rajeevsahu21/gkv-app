import { PartialType, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['name', 'profileImage', 'registrationNo'] as const),
) {
  @IsOptional()
  @IsString()
  token?: string;
}
