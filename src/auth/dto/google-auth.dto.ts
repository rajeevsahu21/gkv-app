import { IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsOptional()
  @IsString({ message: 'Google credential must be a string.' })
  credential?: string;

  @IsOptional()
  @IsString({ message: 'User token must be a string.' })
  userToken?: string;
}
