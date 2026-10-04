import { IsString, IsOptional, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SLUG_PATTERN, COLOR_PATTERN } from '../../common/validators/patterns';
export class UpdateSchoolDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) @Matches(SLUG_PATTERN) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(COLOR_PATTERN) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() campusId?: string;
}
