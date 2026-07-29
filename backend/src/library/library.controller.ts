import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { LibraryService } from './library.service';
import { UpdateImageDto, MoveImagesDto, CreateFolderDto } from './dto/library.dto';

const storage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'library'),
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Body('description') description?: string,
  ) {
    return this.libraryService.uploadImage(file, req.user as User, description);
  }

  @Get('images')
  getImages(@Request() req: any, @Query('folderId') folderId?: string, @Query('agentId') agentId?: string) {
    return this.libraryService.getImages(req.user as User, folderId, agentId);
  }

  @Get('trash')
  getTrash(@Request() req: any) {
    return this.libraryService.getTrash(req.user as User);
  }

  @Get('stats')
  getStats(@Request() req: any, @Query('agentId') agentId?: string) {
    return this.libraryService.getStats(req.user as User, agentId);
  }

  @Patch('images/:id')
  updateImage(
    @Param('id') id: string,
    @Body() dto: UpdateImageDto,
    @Request() req: any,
  ) {
    return this.libraryService.updateImage(id, dto, req.user as User);
  }

  @Delete('images/:id')
  softDelete(@Param('id') id: string, @Request() req: any) {
    return this.libraryService.softDelete(id, req.user as User);
  }

  @Post('images/:id/restore')
  restore(@Param('id') id: string, @Request() req: any) {
    return this.libraryService.restore(id, req.user as User);
  }

  @Delete('images/:id/permanent')
  permanentDelete(@Param('id') id: string, @Request() req: any) {
    return this.libraryService.permanentDelete(id, req.user as User);
  }

  @Post('move')
  moveImages(@Body() dto: MoveImagesDto, @Request() req: any) {
    return this.libraryService.moveImages(dto, req.user as User);
  }

  @Post('folders')
  createFolder(@Body() dto: CreateFolderDto, @Request() req: any) {
    return this.libraryService.createFolder(dto.name, req.user as User);
  }

  @Get('folders')
  getFolders(@Request() req: any, @Query('agentId') agentId?: string) {
    return this.libraryService.getFolders(req.user as User, agentId);
  }

  @Patch('folders/:id')
  renameFolder(@Param('id') id: string, @Body('name') name: string, @Request() req: any) {
    return this.libraryService.renameFolder(id, name, req.user as User);
  }

  @Delete('folders/:id')
  deleteFolder(@Param('id') id: string, @Request() req: any) {
    return this.libraryService.deleteFolder(id, req.user as User);
  }
}
