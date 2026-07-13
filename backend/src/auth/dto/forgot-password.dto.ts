import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Adresse email associée au compte pour recevoir le lien de réinitialisation',
    example: 'mohamed.benali@qualite.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
