import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateVisitDto) {
    // Verify service exists and belongs to user
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, userId },
    });

    if (!service) {
      throw new NotFoundException('Usługa nie istnieje');
    }

    return this.prisma.visit.create({
      data: {
        userId,
        serviceId: dto.serviceId,
        visitDate: new Date(dto.visitDate),
        status: dto.status || 'completed',
        actualPrice: dto.actualPrice,
        notes: dto.notes,
      },
      include: {
        service: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.visit.findMany({
      where: { userId },
      include: { service: true },
      orderBy: { visitDate: 'desc' },
    });
  }

  async findByDate(userId: string, date: string) {
    const visitDate = new Date(date);
    const visits = await this.prisma.visit.findMany({
      where: {
        userId,
        visitDate,
      },
      include: {
        service: true,
        galleryImages: {
          take: 1,
          select: {
            id: true,
            thumbnailPath: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform galleryImages to images with thumbnailUrl (include userId in path)
    return visits.map((visit) => ({
      ...visit,
      images: visit.galleryImages.map((img) => ({
        id: img.id,
        thumbnailUrl: img.thumbnailPath
          ? `/uploads/gallery/${userId}/${img.thumbnailPath}`
          : null,
      })),
      galleryImages: undefined,
    }));
  }

  async findByDateRange(userId: string, startDate: string, endDate: string) {
    return this.prisma.visit.findMany({
      where: {
        userId,
        visitDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: { service: true },
      orderBy: { visitDate: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, userId },
      include: { service: true },
    });

    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    return visit;
  }

  async update(userId: string, id: string, dto: UpdateVisitDto) {
    await this.findOne(userId, id);

    return this.prisma.visit.update({
      where: { id },
      data: dto,
      include: { service: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.visit.delete({
      where: { id },
    });
  }

  async getDaySummary(userId: string, date: string) {
    const visitDate = new Date(date);
    const visits = await this.prisma.visit.findMany({
      where: { userId, visitDate },
      include: { service: true },
    });

    const completed = visits.filter((v) => v.status === 'completed');
    const noShows = visits.filter((v) => v.status === 'no_show');

    const revenue = completed.reduce((sum, v) => {
      const price = v.actualPrice ?? v.service.price;
      return sum + Number(price);
    }, 0);

    const materialCosts = completed.reduce((sum, v) => {
      return sum + Number(v.service.materialCost);
    }, 0);

    const noShowCost = noShows.reduce((sum, v) => {
      return sum + Number(v.service.price);
    }, 0);

    return {
      date,
      visitCount: completed.length,
      noShowCount: noShows.length,
      revenue,
      materialCosts,
      noShowCost,
      visits,
    };
  }
}
