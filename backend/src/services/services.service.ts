import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.service.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(userId: string) {
    return this.prisma.service.findMany({
      where: { userId, isActive: true },
      include: { category: true },
      orderBy: [
        { isFavorite: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(userId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, userId },
    });

    if (!service) {
      throw new NotFoundException('Usługa nie została znaleziona');
    }

    return service;
  }

  async create(userId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        userId,
        name: dto.name,
        price: new Prisma.Decimal(dto.price),
        durationMinutes: dto.durationMinutes,
        materialCost: new Prisma.Decimal(dto.materialCost ?? 0),
        isActive: dto.isActive ?? true,
        categoryId: dto.categoryId ?? null,
      },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(userId, id);

    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        durationMinutes: dto.durationMinutes,
        materialCost: dto.materialCost !== undefined ? new Prisma.Decimal(dto.materialCost) : undefined,
        isActive: dto.isActive,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
      },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.service.delete({
      where: { id },
    });
  }

  async toggleFavorite(userId: string, id: string) {
    const service = await this.findOne(userId, id);

    return this.prisma.service.update({
      where: { id },
      data: {
        isFavorite: !service.isFavorite,
      },
    });
  }
}
