import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @MinLength(3)
  @IsString()
  name: string;

  /**
   * Gkv E-mail
   * @example 196301078@gkv.ac.in
   */
  @IsEmail(
    { host_whitelist: ['gkv.ac.in'] },
    { message: 'Please use GKV E-mail' },
  )
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;
}
