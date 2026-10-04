import { IsOptional, IsString, IsEnum, IsInt, Min, Max, MaxLength, Validate } from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceType, ResourceStatus } from '@prisma/client';
import { MaxAcademicYearConstraint } from '../../common/validators/max-year.validator';

export class QueryResourceDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() campusId?: string;
  @IsOptional() @IsString() schoolId?: string;
  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsEnum(ResourceType) type?: ResourceType;
  @IsOptional() @IsEnum(ResourceStatus) status?: ResourceStatus;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() semester?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Validate(MaxAcademicYearConstraint) year?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 20;
}
