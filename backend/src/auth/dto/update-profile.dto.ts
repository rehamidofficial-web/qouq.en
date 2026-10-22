import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Foto disimpan sebagai data URL kecil (sudah diperkecil di browser).
const IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const COVER = /^(tpl:[1-6]|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1'])
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

  @IsOptional()
  @IsInt()
  @IsIn([10, 15, 30, 60])
  dailyGoalMinutes?: number;

  // "" = hapus foto
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  @Matches(IMAGE, { message: 'Foto harus JPG, PNG, atau WebP', each: false })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400_000)
  @Matches(COVER, { message: 'Sampul tidak valid' })
  coverUrl?: string;
}
