import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @MinLength(3)
  @IsString()
  name: string;

  /**
   * E-mail
   * @example 196301078@gkv.ac.in
   */
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;
}
