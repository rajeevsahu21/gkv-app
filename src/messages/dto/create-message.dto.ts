import { IsMongoId, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsMongoId()
  courseId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;
}
