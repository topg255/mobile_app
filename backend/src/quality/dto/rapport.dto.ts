import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RapportDto {
  @ApiProperty({
    description: 'Date de début de la période (format YYYY-MM-DD)',
    example: '2026-07-01',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  debutDate: string;

  @ApiProperty({
    description: 'Date de fin de la période (format YYYY-MM-DD)',
    example: '2026-07-13',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'UUID de l\'agent qualité (requis pour les superviseurs, ignoré pour les agents)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  agentId?: string;
}
