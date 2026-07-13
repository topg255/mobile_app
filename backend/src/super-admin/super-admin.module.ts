import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { User } from '../auth/entities/user.entity';
import { LoginLog } from '../auth/entities/login-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, LoginLog])],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
