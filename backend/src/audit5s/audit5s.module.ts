import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit5S } from './entities/audit5s.entity';
import { Critere5S } from './entities/critere5s.entity';
import { Audit5SService } from './audit5s.service';
import { Audit5SController } from './audit5s.controller';
import { User } from '../auth/entities/user.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { CapaModule } from '../capa/capa.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Audit5S, Critere5S, User, LigneControle]),
    CapaModule,
  ],
  controllers: [Audit5SController],
  providers: [Audit5SService],
  exports: [Audit5SService],
})
export class Audit5SModule {}
