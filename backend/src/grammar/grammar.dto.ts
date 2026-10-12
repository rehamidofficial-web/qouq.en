import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AnswerItemDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  // Untuk soal pilihan ganda
  @IsOptional()
  @IsString()
  optionId?: string;

  // Untuk soal isian
  @IsOptional()
  @IsString()
  @MaxLength(200)
  answerText?: string;
}

export class SubmitGrammarDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers!: AnswerItemDto[];
}
