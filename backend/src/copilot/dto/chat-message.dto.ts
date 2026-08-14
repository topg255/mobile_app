import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({
    enum: ['user', 'assistant'],
    description: 'Role du message',
  })
  @IsIn(['user', 'assistant'], {
    message: 'Le role doit etre user ou assistant',
  })
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Contenu du message' })
  @IsString()
  @IsNotEmpty({ message: 'Le contenu du message est requis' })
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Historique de la conversation',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
