import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperviseurSignature } from './entities/superviseur-signature.entity';
import { SignaturePadService } from './signature-pad.service';
import { SignaturePadController } from './signature-pad.controller';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SuperviseurSignature, User])],
  controllers: [SignaturePadController],
  providers: [SignaturePadService],
  exports: [SignaturePadService],
})
export class SignaturePadModule {}
