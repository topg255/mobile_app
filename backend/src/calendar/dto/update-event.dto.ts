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
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CalendarEventType,
  EventPriority,
  EventStatus,
} from '../entities/calendar-event.entity';
import { IsDateAfter } from './is-date-after.decorator';

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le titre ne peut pas etre vide' })
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: CalendarEventType })
  @IsOptional()
  @IsEnum(CalendarEventType, { message: 'Type invalide' })
  type?: CalendarEventType;

  @ApiPropertyOptional({ enum: EventPriority })
  @IsOptional()
  @IsEnum(EventPriority, { message: 'Priorite invalide' })
  priority?: EventPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Date de debut invalide' })
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Date de fin invalide' })
  @IsDateAfter('startDate')
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'Id (uuid) de l agent assigne' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recurrenceRule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reminderMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Couleur invalide (attendu #RRGGBB)' })
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  attachmentNote?: string;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus, { message: 'Statut invalide' })
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  completedNote?: string;
}