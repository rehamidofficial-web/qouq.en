import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class StartSessionDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(['PRACTICE', 'TEST'])
  mode?: 'PRACTICE' | 'TEST';
}

export class AttemptDto {
  @IsString()
  @IsNotEmpty()
  sentenceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  spokenText!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class CompareDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  targetText!: string;

  @IsString()
  @MaxLength(500)
  spokenText!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}
