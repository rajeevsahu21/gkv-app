import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail(
    { host_whitelist: ['gkv.ac.in'] },
    { message: 'Please use GKV E-mail' },
  )
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsNotEmpty()
  @MinLength(3)
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsOptional()
  gId?: string;

  @IsOptional()
  profileImage?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  registrationNo?: string;

  @IsNotEmpty()
  @IsString()
  role: string;

  @IsOptional()
  confirmationCode?: string;
}
