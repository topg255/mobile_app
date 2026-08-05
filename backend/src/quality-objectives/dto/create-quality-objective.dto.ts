import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ObjectiveCategory,
  ObjectivePriority,
} from '../entities/quality-objective.entity';

export class CreateQualityObjectiveDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ObjectiveCategory, { message: 'Categorie invalide' })
  category: ObjectiveCategory;

  @IsNumber({}, { message: 'La cible doit etre un nombre' })
  @Min(0)
  @Max(1e12)
  targetValue: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsEnum(ObjectivePriority, { message: 'Priorite invalide' })
  priority?: ObjectivePriority;

  @IsDateString({}, { message: 'Date de debut invalide' })
  startDate: string;

  @IsDateString({}, { message: 'Date de fin invalide' })
  endDate: string;

  @IsOptional()
  @IsBoolean()
  higherIsBetter?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'La valeur courante doit etre un nombre' })
  @Min(0)
  @Max(1e12)
  currentValue?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  superviseurId?: string;
}
