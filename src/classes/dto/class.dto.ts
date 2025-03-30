import { IsMongoId } from 'class-validator';

export class ClassDto {
  @IsMongoId()
  classId: string;
}
