import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, Validate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import { MaxAcademicYearConstraint } from '../../common/validators/max-year.validator';
import { SLUG_PATTERN } from '../../common/validators/patterns';

export const RESOURCE_LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'];
export const RESOURCE_SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export { SLUG_PATTERN };

function parseTags(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }
  return value;
}

/** Normalisation : trim, minuscules, dédoublonnage (recherche insensible à la casse). */
export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export class CreateResourceDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiProperty({ enum: ResourceType }) @IsEnum(ResourceType) type: ResourceType;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(RESOURCE_LEVELS) level?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(RESOURCE_SEMESTERS) semester?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Validate(MaxAcademicYearConstraint)
  year?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseTags(value))
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(30, { each: true })
  tags?: string[];
  @ApiProperty() @IsString() @IsNotEmpty() campusId: string;
  @ApiProperty() @IsString() @IsNotEmpty() schoolId: string;
  @ApiProperty() @IsString() @IsNotEmpty() subjectId: string;
}
