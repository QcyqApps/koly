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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GalleryService } from './gallery.service';
import { CreateGalleryImageDto } from './dto/create-gallery-image.dto';
import { UpdateGalleryImageDto } from './dto/update-gallery-image.dto';
import { LinkVisitDto } from './dto/link-visit.dto';

@Controller('gallery')
@UseGuards(JwtAuthGuard)
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: CreateGalleryImageDto,
  ) {
    return this.galleryService.uploadImage(userId, file, dto);
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('isPortfolio') isPortfolio?: string,
    @Query('visitId') visitId?: string,
  ) {
    const filter: { isPortfolio?: boolean; visitId?: string } = {};

    if (isPortfolio !== undefined) {
      filter.isPortfolio = isPortfolio === 'true';
    }

    if (visitId) {
      filter.visitId = visitId;
    }

    return this.galleryService.findAll(userId, filter);
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.galleryService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGalleryImageDto,
  ) {
    return this.galleryService.update(userId, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.galleryService.delete(userId, id);
    return { success: true };
  }

  @Post(':id/caption')
  async generateCaption(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.galleryService.generateCaption(userId, id);
  }

  @Get(':id/captions')
  async getCaptions(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.galleryService.getCaptions(userId, id);
  }

  @Post(':id/link-visit')
  async linkToVisit(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: LinkVisitDto,
  ) {
    return this.galleryService.linkToVisit(userId, id, dto.visitId);
  }
}
