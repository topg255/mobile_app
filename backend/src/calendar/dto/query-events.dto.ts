import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CalendarEventType,
  EventPriority,
  EventStatus,
} from '../entities/calendar-event.entity';

export class QueryEventsDto {
  @ApiProperty({ description: 'Borne inferieure (ISO)' })
  @IsDateString({}, { message: 'startDate doit etre une date ISO' })
  startDate: string;

  @ApiProperty({ description: 'Borne superieure (ISO)' })
  @IsDateString({}, { message: 'endDate doit etre une date ISO' })
  endDate: string;

  @ApiPropertyOptional({
    enum: CalendarEventType,
    description: 'Un ou plusieurs types separes par des virgules',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    enum: EventPriority,
    description: 'Une ou plusieurs priorites separees par des virgules',
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Id (uuid) de l agent assigne' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ description: 'Uniquement les taches personnelles' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  myEventsOnly?: boolean;
}

export class MyTasksQueryDto {
  @ApiProperty({ description: 'Borne inferieure (ISO)' })
  @IsDateString({}, { message: 'startDate doit etre une date ISO' })
  startDate: string;

  @ApiProperty({ description: 'Borne superieure (ISO)' })
  @IsDateString({}, { message: 'endDate doit etre une date ISO' })
  endDate: string;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ description: 'Paginer par offset' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite par page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}