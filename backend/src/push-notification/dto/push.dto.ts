import {
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  PushCategory,
  PushPriority,
} from '../entities/push-notification-history.entity';

export class SendPushDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Le corps est obligatoire' })
  @MaxLength(1000)
  body: string;

  @IsEnum(PushCategory, { message: 'Categorie invalide' })
  category: PushCategory;

  @IsOptional()
  @IsEnum(PushPriority, { message: 'Priorite invalide' })
  priority?: PushPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds?: string[];

  @IsOptional()
  @IsIn(['super_admin', 'superviseur_qualite', 'agent_qualite'], {
    message: 'Role invalide',
  })
  role?: string;
}

export class PushStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'historyId requis' })
  historyId: string;

  @IsIn(['delivered', 'opened', 'clicked', 'dismissed'], {
    message: 'Statut invalide',
  })
  status: 'delivered' | 'opened' | 'clicked' | 'dismissed';
}

export class UpdateEscalationDto {
  @IsOptional()
  @IsIn([5, 10, 15, 20, 30, 45, 60], { message: 'Minutes invalides' })
  criticalEscalationMin?: number;

  @IsOptional()
  @IsIn([10, 15, 20, 30, 45, 60, 90], { message: 'Minutes invalides' })
  highEscalationMin?: number;

  @IsOptional()
  @IsIn([15, 20, 30, 45, 60, 90, 120], { message: 'Minutes invalides' })
  mediumEscalationMin?: number;

  @IsOptional()
  @IsIn([1, 2, 5, 10, 15, 30, 60], { message: 'Minutes invalides' })
  groupingWindowMin?: number;

  @IsOptional()
  @IsIn([true, false], { message: 'Valeur invalide' })
  enabled?: boolean;
}
