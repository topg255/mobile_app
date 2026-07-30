import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    description: 'Prenom de l\'utilisateur',
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
    description: 'Adresse email de l\'utilisateur (doit etre unique)',
    example: 'mohamed.benali@qualite.com',
    format: 'email',
    uniqueItems: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Mot de passe de l\'utilisateur (minimum 8 caracteres)',
    example: 'MonMotDePasse123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Code du superviseur (SUPERV-QLT-XXXXX) — requis pour les agents',
    example: 'SUPERV-QLT-A1B2C',
  })
  @IsOptional()
  @IsString()
  @Matches(/^SUPERV-QLT-[A-Z0-9]{5}$/, {
    message: 'Le code superviseur doit etre au format SUPERV-QLT-XXXXX',
  })
  superviseurCode?: string;
}
