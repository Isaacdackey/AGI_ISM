import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MaxLength(72) currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(12, { message: 'Nouveau mot de passe : 12 caractères minimum' })
  @MaxLength(72, { message: 'Nouveau mot de passe : 72 caractères maximum' })
  newPassword: string;
}
