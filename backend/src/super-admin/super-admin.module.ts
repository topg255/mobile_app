import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { User } from '../auth/entities/user.entity';
import { LoginLog } from '../auth/entities/login-log.entity';
import { Message } from '../chat/entities/message.entity';
import { ControleDate } from '../quality/entities/controle-date.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { Notification } from '../notification/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, LoginLog, Message, ControleDate, LigneControle, Notification])],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
