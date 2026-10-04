import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, Validate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import { MaxAcademicYearConstraint } from '../../common/validators/max-year.validator';
import { RESOURCE_LEVELS, RESOURCE_SEMESTERS } from './create-resource.dto';

export class UpdateResourceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({ enum: ResourceType }) @IsOptional() @IsEnum(ResourceType) type?: ResourceType;
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
  @Transform(({ value }) => {
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
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(30, { each: true })
  tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() campusId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() schoolId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subjectId?: string;
}
