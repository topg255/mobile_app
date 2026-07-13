import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateControleDateDto {
  @ApiProperty({
    description: 'Date de contrôle (format YYYY-MM-DD). Seules les dates d\'aujourd\'hui ou futures sont acceptées.',
    example: '2026-07-13',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  dateControle: string;
}
