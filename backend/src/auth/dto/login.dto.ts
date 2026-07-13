import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Matricule de l\'utilisateur',
    example: 'SUP-2024-001',
  })
  @IsString()
  @IsNotEmpty()
  matricule: string;

  @ApiProperty({
    description: 'Mot de passe de l\'utilisateur',
    example: 'MonMotDePasse123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
