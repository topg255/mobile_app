import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CalendarEventType,
  EventPriority,
} from '../entities/calendar-event.entity';
import { IsDateAfter } from './is-date-after.decorator';

export class CreateEventDto {
  @ApiProperty({ description: 'Titre de la tache / evenement' })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Detail libre de la tache' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ enum: CalendarEventType })
  @IsEnum(CalendarEventType, { message: 'Type invalide' })
  type: CalendarEventType;

  @ApiPropertyOptional({ enum: EventPriority, default: EventPriority.MEDIUM })
  @IsOptional()
  @IsEnum(EventPriority, { message: 'Priorite invalide' })
  priority?: EventPriority = EventPriority.MEDIUM;

  @ApiProperty({ description: 'Date + heure de debut (ISO)' })
  @Type(() => Date)
  @IsDate({ message: 'Date de debut invalide' })
  startDate: Date;

  @ApiProperty({ description: 'Date + heure de fin (ISO)' })
  @Type(() => Date)
  @IsDate({ message: 'Date de fin invalide' })
  @IsDateAfter('startDate')
  endDate: Date;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ description: 'Ex: Atelier 3, Ligne L-07' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({
    description: "Id (uuid) de l'agent assigne — absent = tache personnelle",
  })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Format iCal RRULE ex: FREQ=WEEKLY;BYDAY=MO,WE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Rappel X minutes avant' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reminderMinutes?: number;

  @ApiPropertyOptional({ description: 'Couleur hex personnalisee' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Couleur invalide (attendu #RRGGBB)' })
  color?: string;

  @ApiPropertyOptional({ description: 'Note ou lien joint' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  attachmentNote?: string;
}