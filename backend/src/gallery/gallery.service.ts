import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateGalleryImageDto } from './dto/create-gallery-image.dto';
import { UpdateGalleryImageDto } from './dto/update-gallery-image.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GalleryService {
  private readonly n8nCaptionWebhookUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.n8nCaptionWebhookUrl =
      this.configService.get<string>('N8N_CAPTION_WEBHOOK_URL') ||
      this.configService.get<string>('N8N_CHAT_WEBHOOK_URL') ||
      '';
  }

  async uploadImage(
    userId: string,
    file: Express.Multer.File,
    dto: CreateGalleryImageDto,
  ) {
    const { filename, thumbnailPath } = await this.uploadService.saveFile(
      file,
      userId,
    );

    const image = await this.prisma.galleryImage.create({
      data: {
        userId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        thumbnailPath,
        description: dto.description,
        visitId: dto.visitId,
        isPortfolio: dto.isPortfolio ?? true,
      },
      include: {
        visit: {
          include: {
            service: true,
          },
        },
      },
    });

    return this.addUrls(image, userId);
  }

  async findAll(
    userId: string,
    filter?: { isPortfolio?: boolean; visitId?: string },
  ) {
    const where: any = { userId };

    if (filter?.isPortfolio !== undefined) {
      where.isPortfolio = filter.isPortfolio;
    }

    if (filter?.visitId) {
      where.visitId = filter.visitId;
    }

    const images = await this.prisma.galleryImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        visit: {
          include: {
            service: true,
          },
        },
        captions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return images.map((img) => this.addUrls(img, userId));
  }

  async findOne(userId: string, id: string) {
    const image = await this.prisma.galleryImage.findUnique({
      where: { id },
      include: {
        visit: {
          include: {
            service: true,
          },
        },
        captions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.addUrls(image, userId);
  }

  async update(userId: string, id: string, dto: UpdateGalleryImageDto) {
    const image = await this.findOne(userId, id);

    const updated = await this.prisma.galleryImage.update({
      where: { id },
      data: dto,
      include: {
        visit: {
          include: {
            service: true,
          },
        },
      },
    });

    return this.addUrls(updated, userId);
  }

  async delete(userId: string, id: string) {
    const image = await this.findOne(userId, id);

    await this.uploadService.deleteFile(image.filename, userId);
    await this.prisma.galleryImage.delete({ where: { id } });
  }

  async linkToVisit(userId: string, imageId: string, visitId: string) {
    await this.findOne(userId, imageId);

    // Verify visit belongs to user
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
    });

    if (!visit || visit.userId !== userId) {
      throw new NotFoundException('Visit not found');
    }

    const updated = await this.prisma.galleryImage.update({
      where: { id: imageId },
      data: { visitId },
      include: {
        visit: {
          include: {
            service: true,
          },
        },
      },
    });

    return this.addUrls(updated, userId);
  }

  async generateCaption(userId: string, imageId: string) {
    const image = await this.findOne(userId, imageId);

    // Get user context
    const context = await this.getUserContext(userId);

    // Get user's communication style from recent messages
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: {
        userId,
        role: 'user',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { content: true },
    });

    const communicationStyle = recentMessages.map((m) => m.content);

    // Try n8n webhook
    let captionContent = await this.callN8nForCaption({
      imageDescription: image.description || 'zdjęcie stylizacji paznokci',
      context,
      communicationStyle,
      linkedService: image.visit?.service,
    });

    // Fallback to mock if n8n fails
    if (!captionContent) {
      captionContent = this.generateMockCaption(context, image.visit?.service);
    }

    // Save caption
    const caption = await this.prisma.generatedCaption.create({
      data: {
        userId,
        imageId,
        content: captionContent,
        platform: 'instagram',
      },
    });

    return caption;
  }

  async getCaptions(userId: string, imageId: string) {
    await this.findOne(userId, imageId);

    return this.prisma.generatedCaption.findMany({
      where: { imageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getUserContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        businessName: true,
        industry: true,
        city: true,
      },
    });

    const services = await this.prisma.service.findMany({
      where: { userId, isActive: true },
      select: {
        name: true,
        price: true,
      },
    });

    return {
      user,
      services: services.map((s) => ({
        name: s.name,
        price: Number(s.price),
      })),
    };
  }

  private async callN8nForCaption(data: {
    imageDescription: string;
    context: any;
    communicationStyle: string[];
    linkedService?: { name: string; price: any } | null;
  }): Promise<string | null> {
    if (!this.n8nCaptionWebhookUrl) {
      return null;
    }

    try {
      const response = await fetch(this.n8nCaptionWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'instagram_caption',
          imageDescription: data.imageDescription,
          context: {
            user: data.context.user,
            services: data.context.services,
            communicationStyle: data.communicationStyle,
            linkedService: data.linkedService
              ? {
                  name: data.linkedService.name,
                  price: Number(data.linkedService.price),
                }
              : null,
          },
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        console.error('n8n caption webhook error:', response.status);
        return null;
      }

      const result = await response.json();
      return result.caption || result.response || result.output || null;
    } catch (error) {
      console.error('n8n caption webhook error:', error);
      return null;
    }
  }

  private generateMockCaption(
    context: any,
    linkedService?: { name: string; price: any } | null,
  ): string {
    const adjectives = [
      'elegancka',
      'subtelna',
      'wyjątkowa',
      'piękna',
      'stylowa',
      'modna',
      'klasyczna',
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];

    const service = linkedService || context.services[0];
    const serviceName = service?.name || 'stylizacja';
    const price = service?.price || '';

    const priceText = price ? ` Cena: ${price} zł.` : '';

    return `✨ ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} - ${adj} propozycja na ten sezon!\n\n${priceText}\n\n📩 Zapisz się przez DM\n\n#paznokcie #nails #manicure #${context.user?.city?.toLowerCase() || 'polska'}`;
  }

  private addUrls(image: any, userId: string) {
    return {
      ...image,
      imageUrl: this.uploadService.getImageUrl(image.filename, userId),
      thumbnailUrl: this.uploadService.getThumbnailUrl(
        image.thumbnailPath,
        userId,
      ),
    };
  }
}
