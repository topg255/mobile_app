import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SubscribePushDto {
  @IsString()
  @IsNotEmpty({ message: 'Endpoint requis' })
  @MaxLength(2000)
  endpoint: string;

  @IsString()
  @IsNotEmpty({ message: 'Cle p256dh requise' })
  @MaxLength(500)
  p256dh: string;

  @IsString()
  @IsNotEmpty({ message: 'Cle auth requise' })
  @MaxLength(500)
  auth: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  browser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  device?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;
}

export class UnsubscribePushDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  endpoint?: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  criticalAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  aiReports?: boolean;

  @IsOptional()
  @IsBoolean()
  objectives?: boolean;

  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @IsOptional()
  @IsBoolean()
  benchmarkAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyReports?: boolean;

  @IsOptional()
  @IsBoolean()
  systemNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  capaAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dndEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(
    [
      '00:00',
      '00:30',
      '01:00',
      '01:30',
      '02:00',
      '02:30',
      '03:00',
      '03:30',
      '04:00',
      '04:30',
      '05:00',
      '05:30',
      '06:00',
      '06:30',
      '07:00',
      '07:30',
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
      '21:00',
      '21:30',
      '22:00',
      '22:30',
      '23:00',
      '23:30',
    ],
    { message: 'Heure invalide (format HH:MM, pas par 30 minutes)' },
  )
  dndStart?: string;

  @IsOptional()
  @IsString()
  @IsIn(
    [
      '00:00',
      '00:30',
      '01:00',
      '01:30',
      '02:00',
      '02:30',
      '03:00',
      '03:30',
      '04:00',
      '04:30',
      '05:00',
      '05:30',
      '06:00',
      '06:30',
      '07:00',
      '07:30',
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
      '21:00',
      '21:30',
      '22:00',
      '22:30',
      '23:00',
      '23:30',
    ],
    { message: 'Heure invalide (format HH:MM, pas par 30 minutes)' },
  )
  dndEnd?: string;
}
