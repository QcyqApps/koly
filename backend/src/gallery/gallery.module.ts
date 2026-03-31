import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GalleryController } from './gallery.controller';
import { GalleryService } from './gallery.service';
import { UploadModule } from '../upload/upload.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
    UploadModule,
    PrismaModule,
  ],
  controllers: [GalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
