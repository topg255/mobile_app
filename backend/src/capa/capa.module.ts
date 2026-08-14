import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Capa } from './entities/capa.entity';
import { CapaAction } from './entities/capa-action.entity';
import { CapaCommentaire } from './entities/capa-commentaire.entity';
import { CapaService } from './capa.service';
import { CapaController } from './capa.controller';
import { User } from '../auth/entities/user.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { EmailService } from '../report/email.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Capa, CapaAction, CapaCommentaire, User, LigneControle]),
    NotificationModule,
  ],
  controllers: [CapaController],
  providers: [CapaService, EmailService],
  exports: [CapaService],
})
export class CapaModule {}