import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
      include: {
        services: {
          where: { isActive: true },
          orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, userId },
      include: {
        services: {
          where: { isActive: true },
          orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Kategoria nie została znaleziona');
    }

    return category;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    // Get max order
    const maxOrder = await this.prisma.serviceCategory.aggregate({
      where: { userId },
      _max: { order: true },
    });

    return this.prisma.serviceCategory.create({
      data: {
        userId,
        name: dto.name,
        order: dto.order ?? (maxOrder._max.order ?? 0) + 1,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(userId, id);

    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        name: dto.name,
        order: dto.order,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    // Services will have categoryId set to null due to onDelete: SetNull
    return this.prisma.serviceCategory.delete({
      where: { id },
    });
  }

  async reorder(userId: string, categoryIds: string[]) {
    // Update order for each category
    const updates = categoryIds.map((id, index) =>
      this.prisma.serviceCategory.updateMany({
        where: { id, userId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.findAll(userId);
  }
}
