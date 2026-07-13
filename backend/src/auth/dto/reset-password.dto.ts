import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de réinitialisation reçu par email (valable 15 minutes)',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Nouveau mot de passe (minimum 8 caractères)',
    example: 'NouveauMotDePasse456!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  newPassword: string;
}
