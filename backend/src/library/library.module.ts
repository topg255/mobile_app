import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryImage } from './entities/library-image.entity';
import { ImageFolder } from './entities/image-folder.entity';
import { User } from '../auth/entities/user.entity';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryImage, ImageFolder, User])],
  providers: [LibraryService],
  controllers: [LibraryController],
  exports: [LibraryService],
})
export class LibraryModule {}
