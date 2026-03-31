import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFixedCostDto } from './dto/create-fixed-cost.dto';
import { UpdateFixedCostDto } from './dto/update-fixed-cost.dto';

@Injectable()
export class FixedCostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.fixedCost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const fixedCost = await this.prisma.fixedCost.findFirst({
      where: { id, userId },
    });

    if (!fixedCost) {
      throw new NotFoundException('Koszt stały nie został znaleziony');
    }

    return fixedCost;
  }

  async create(userId: string, dto: CreateFixedCostDto) {
    return this.prisma.fixedCost.create({
      data: {
        userId,
        name: dto.name,
        amount: new Prisma.Decimal(dto.amount),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateFixedCostDto) {
    await this.findOne(userId, id);

    return this.prisma.fixedCost.update({
      where: { id },
      data: {
        name: dto.name,
        amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.fixedCost.delete({
      where: { id },
    });
  }

  async getTotal(userId: string) {
    const costs = await this.prisma.fixedCost.findMany({
      where: { userId, isActive: true },
      select: { amount: true },
    });

    return costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  }
}
