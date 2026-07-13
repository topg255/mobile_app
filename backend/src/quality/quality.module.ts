import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';
import { ControleDate } from './entities/controle-date.entity';
import { LigneControle } from './entities/ligne-controle.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ControleDate, LigneControle, User])],
  controllers: [QualityController],
  providers: [QualityService],
})
export class QualityModule {}
