import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        industry: true,
        city: true,
        taxForm: true,
        taxRate: true,
        zusMonthly: true,
        monthlyGoal: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });
  }

  async update(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        taxRate: dto.taxRate ? new Prisma.Decimal(dto.taxRate) : undefined,
        zusMonthly: dto.zusMonthly ? new Prisma.Decimal(dto.zusMonthly) : undefined,
        monthlyGoal: dto.monthlyGoal !== undefined ? (dto.monthlyGoal ? new Prisma.Decimal(dto.monthlyGoal) : null) : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        industry: true,
        city: true,
        taxForm: true,
        taxRate: true,
        zusMonthly: true,
        monthlyGoal: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });
  }

  async setMonthlyGoal(userId: string, goal: number | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        monthlyGoal: goal ? new Prisma.Decimal(goal) : null,
      },
      select: {
        id: true,
        monthlyGoal: true,
      },
    });
  }
}
