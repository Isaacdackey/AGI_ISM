import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class LoginDto {
  @ApiProperty() @IsEmail({}, { message: 'Veuillez saisir une adresse email valide' }) @MaxLength(254) email: string;
  @ApiProperty() @IsString({ message: 'Mot de passe requis' }) @MaxLength(72) password: string;
}
