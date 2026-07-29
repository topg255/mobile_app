import { IsString, IsOptional } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  name: string;
}

export class UpdateImageDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  folderId?: string | null;
}

export class MoveImagesDto {
  @IsString({ each: true })
  imageIds: string[];

  @IsString()
  @IsOptional()
  folderId?: string | null;
}
