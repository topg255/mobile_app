import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { NoteQualite } from '../entities/ligne-controle.entity';

export class CreateLigneControleDto {
  @ApiProperty({
    description: 'Note qualité de la ligne',
    enum: NoteQualite,
    example: NoteQualite.VERT,
    examples: {
      vert: {
        value: NoteQualite.VERT,
        summary: 'Vert - Conforme',
        description: 'La ligne est conforme aux standards qualité',
      },
      jaune: {
        value: NoteQualite.JAUNE,
        summary: 'Jaune - Attention',
        description: 'La ligne nécessite une attention particulière',
      },
      rouge: {
        value: NoteQualite.ROUGE,
        summary: 'Rouge - Non conforme',
        description: 'La ligne est non conforme aux standards qualité',
      },
    },
  })
  @IsEnum(NoteQualite)
  @IsNotEmpty()
  note: NoteQualite;

  @ApiProperty({
    description: 'Délai en minutes d\'arrêt',
    example: '30',
  })
  @IsString()
  @IsNotEmpty()
  delais: string;

  @ApiProperty({
    description: 'Nom de la ligne',
    example: 'Ligne A1',
  })
  @IsString()
  @IsNotEmpty()
  nomLigne: string;

  @ApiProperty({
    description: 'Heure de la ligne de contrôle',
    example: '14:30',
    required: false,
  })
  @IsString()
  @IsOptional()
  heure?: string;

  @ApiProperty({
    description: 'Nom du responsable',
    example: 'Ahmed Trabelsi',
  })
  @IsString()
  @IsNotEmpty()
  responsable: string;

  @ApiProperty({
    description: 'Détails de la ligne de contrôle',
    example: 'Arrêt machine pour maintenance préventive',
  })
  @IsString()
  @IsNotEmpty()
  details: string;

  @ApiProperty({
    description: 'UUID de la date de contrôle à laquelle rattacher cette ligne',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  controleDateId: string;
}
