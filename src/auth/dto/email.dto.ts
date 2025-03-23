import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class EmailDto {
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;
}
