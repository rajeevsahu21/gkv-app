import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class EnrollDto {
  @Length(6, 6)
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  courseCode: string;
}
