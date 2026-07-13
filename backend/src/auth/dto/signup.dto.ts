import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    description: 'Prénom de l\'utilisateur',
    example: 'Mohamed',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Nom de famille de l\'utilisateur',
    example: 'Ben Ali',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Matricule unique de l\'utilisateur (identifiant professionnel)',
    example: 'SUP-2024-001',
    uniqueItems: true,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  matricule: string;

  @ApiProperty({
    description: 'Adresse email de l\'utilisateur (doit être unique)',
    example: 'mohamed.benali@qualite.com',
    format: 'email',
    uniqueItems: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Mot de passe de l\'utilisateur (minimum 8 caractères)',
    example: 'MonMotDePasse123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
