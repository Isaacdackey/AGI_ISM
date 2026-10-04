import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModeratorDto {
  @ApiProperty({ example: 'Moussa Diallo', description: 'Nom complet du modérateur' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'moderateur@ism.sn', description: 'Email unique du modérateur' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;
}
