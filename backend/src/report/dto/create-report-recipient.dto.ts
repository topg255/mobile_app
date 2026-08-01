import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateReportRecipientDto {
  @ApiProperty({
    description: 'Adresse email du destinataire additionnel',
    example: 'manager@leoni.com',
  })
  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: "L'adresse email est requise" })
  email: string;
}
