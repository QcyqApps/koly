import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DayService {
  constructor(private prisma: PrismaService) {}

  async closeDay(userId: string, date: string) {
    const snapshotDate = new Date(date);

    // Check if day already closed
    const existing = await this.prisma.dailySnapshot.findUnique({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Day already closed');
    }

    // Get user data for tax calculation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { taxRate: true, zusMonthly: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get visits for the day
    const visits = await this.prisma.visit.findMany({
      where: { userId, visitDate: snapshotDate },
      include: { service: true },
    });

    const completed = visits.filter((v) => v.status === 'completed');
    const noShows = visits.filter((v) => v.status === 'no_show');

    // Calculate revenue
    const revenue = completed.reduce((sum, v) => {
      const price = v.actualPrice ?? v.service.price;
      return sum.add(new Prisma.Decimal(price));
    }, new Prisma.Decimal(0));

    // Calculate material costs
    const materialCosts = completed.reduce((sum, v) => {
      return sum.add(new Prisma.Decimal(v.service.materialCost));
    }, new Prisma.Decimal(0));

    // Calculate no-show cost (potential lost revenue)
    const noShowCost = noShows.reduce((sum, v) => {
      return sum.add(new Prisma.Decimal(v.service.price));
    }, new Prisma.Decimal(0));

    // Get total fixed costs
    const fixedCosts = await this.prisma.fixedCost.findMany({
      where: { userId, isActive: true },
    });

    const totalFixedCosts = fixedCosts.reduce((sum, c) => {
      return sum.add(new Prisma.Decimal(c.amount));
    }, new Prisma.Decimal(0));

    // Calculate daily fixed costs (assuming 22 working days per month)
    const workingDays = 22;
    const fixedCostsDaily = totalFixedCosts.div(workingDays);

    // Calculate daily ZUS cost
    const zusDaily = new Prisma.Decimal(user.zusMonthly).div(workingDays);

    // Calculate estimated tax
    const taxRate = new Prisma.Decimal(user.taxRate).div(100);
    const estimatedTax = revenue.mul(taxRate);

    // Calculate net profit
    // Net = Revenue - MaterialCosts - FixedCostsDaily - ZUSDaily - Tax
    const netProfit = revenue
      .sub(materialCosts)
      .sub(fixedCostsDaily)
      .sub(zusDaily)
      .sub(estimatedTax);

    // Calculate services ranking
    const servicesRanking = this.calculateServicesRanking(completed);

    // Create snapshot
    const snapshot = await this.prisma.dailySnapshot.create({
      data: {
        userId,
        snapshotDate,
        revenue,
        materialCosts,
        fixedCostsDaily: fixedCostsDaily.add(zusDaily),
        estimatedTax,
        netProfit,
        visitCount: completed.length,
        noShowCount: noShows.length,
        noShowCost,
        servicesRanking,
      },
    });

    return {
      ...snapshot,
      breakdown: {
        revenue: Number(revenue),
        materialCosts: Number(materialCosts),
        fixedCostsDaily: Number(fixedCostsDaily),
        zusDaily: Number(zusDaily),
        estimatedTax: Number(estimatedTax),
        netProfit: Number(netProfit),
      },
    };
  }

  private calculateServicesRanking(
    visits: Array<{
      service: { id: string; name: string; price: Prisma.Decimal; materialCost: Prisma.Decimal };
      actualPrice: Prisma.Decimal | null;
    }>,
  ) {
    const serviceStats = new Map<
      string,
      { name: string; count: number; revenue: number; profit: number }
    >();

    for (const visit of visits) {
      const serviceId = visit.service.id;
      const price = Number(visit.actualPrice ?? visit.service.price);
      const materialCost = Number(visit.service.materialCost);
      const profit = price - materialCost;

      const existing = serviceStats.get(serviceId);
      if (existing) {
        existing.count++;
        existing.revenue += price;
        existing.profit += profit;
      } else {
        serviceStats.set(serviceId, {
          name: visit.service.name,
          count: 1,
          revenue: price,
          profit,
        });
      }
    }

    return Array.from(serviceStats.values()).sort((a, b) => b.profit - a.profit);
  }

  async getSnapshot(userId: string, date: string) {
    const snapshotDate = new Date(date);
    return this.prisma.dailySnapshot.findUnique({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate,
        },
      },
    });
  }

  async getSnapshots(userId: string, startDate: string, endDate: string) {
    return this.prisma.dailySnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });
  }

  async getMonthSummary(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const snapshots = await this.prisma.dailySnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totals = snapshots.reduce(
      (acc, s) => ({
        revenue: acc.revenue + Number(s.revenue),
        materialCosts: acc.materialCosts + Number(s.materialCosts),
        fixedCostsDaily: acc.fixedCostsDaily + Number(s.fixedCostsDaily),
        estimatedTax: acc.estimatedTax + Number(s.estimatedTax),
        netProfit: acc.netProfit + Number(s.netProfit),
        visitCount: acc.visitCount + s.visitCount,
        noShowCount: acc.noShowCount + s.noShowCount,
        noShowCost: acc.noShowCost + Number(s.noShowCost),
      }),
      {
        revenue: 0,
        materialCosts: 0,
        fixedCostsDaily: 0,
        estimatedTax: 0,
        netProfit: 0,
        visitCount: 0,
        noShowCount: 0,
        noShowCost: 0,
      },
    );

    return {
      year,
      month,
      daysWorked: snapshots.length,
      ...totals,
      snapshots,
    };
  }

  // Industry benchmark data (hardcoded from WiseEuropa, TVN24, Wynagrodzenia.pl research)
  private readonly industryBenchmarks: Record<
    string,
    { avgMargin: number; avgVisitsPerDay: number; avgNoShowRate: number }
  > = {
    nails: { avgMargin: 40, avgVisitsPerDay: 6, avgNoShowRate: 10 },
    hair: { avgMargin: 35, avgVisitsPerDay: 7, avgNoShowRate: 12 },
    cosmetics: { avgMargin: 40, avgVisitsPerDay: 5, avgNoShowRate: 10 },
    physio: { avgMargin: 45, avgVisitsPerDay: 6, avgNoShowRate: 8 },
    trainer: { avgMargin: 50, avgVisitsPerDay: 5, avgNoShowRate: 15 },
    photo: { avgMargin: 45, avgVisitsPerDay: 2, avgNoShowRate: 5 },
    tattoo: { avgMargin: 50, avgVisitsPerDay: 3, avgNoShowRate: 8 },
    other: { avgMargin: 35, avgVisitsPerDay: 5, avgNoShowRate: 10 },
  };

  async getBenchmark(userId: string) {
    // Get user industry
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { industry: true },
    });

    const industry = user?.industry || 'other';
    const benchmark = this.industryBenchmarks[industry] || this.industryBenchmarks.other;

    // Get user's current month data
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const snapshots = await this.prisma.dailySnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const daysWorked = snapshots.length;
    if (daysWorked === 0) {
      return {
        hasData: false,
        industry,
        industryBenchmark: benchmark,
        metrics: [],
      };
    }

    // Calculate user metrics
    const totals = snapshots.reduce(
      (acc, s) => ({
        revenue: acc.revenue + Number(s.revenue),
        netProfit: acc.netProfit + Number(s.netProfit),
        visitCount: acc.visitCount + s.visitCount,
        noShowCount: acc.noShowCount + s.noShowCount,
      }),
      { revenue: 0, netProfit: 0, visitCount: 0, noShowCount: 0 },
    );

    const userMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0;
    const userAvgVisitsPerDay = daysWorked > 0 ? totals.visitCount / daysWorked : 0;
    const userNoShowRate =
      totals.visitCount + totals.noShowCount > 0
        ? (totals.noShowCount / (totals.visitCount + totals.noShowCount)) * 100
        : 0;

    const metrics = [
      {
        name: 'margin',
        label: 'Marża zysku',
        description: 'Ile % przychodu zostaje jako zysk po odliczeniu kosztów',
        user: Math.round(userMargin),
        industry: benchmark.avgMargin,
        unit: '%',
        better: userMargin >= benchmark.avgMargin,
        lowerIsBetter: false,
      },
      {
        name: 'visits',
        label: 'Wizyty/dzień',
        description: 'Średnia liczba wykonanych wizyt na dzień pracy',
        user: Math.round(userAvgVisitsPerDay * 10) / 10,
        industry: benchmark.avgVisitsPerDay,
        unit: '',
        better: userAvgVisitsPerDay >= benchmark.avgVisitsPerDay,
        lowerIsBetter: false,
      },
      {
        name: 'noShow',
        label: 'No-show',
        description: '% klientów którzy nie przyszli na umówioną wizytę',
        user: Math.round(userNoShowRate),
        industry: benchmark.avgNoShowRate,
        unit: '%',
        better: userNoShowRate <= benchmark.avgNoShowRate,
        lowerIsBetter: true,
      },
    ];

    return {
      hasData: true,
      industry,
      industryBenchmark: benchmark,
      userMargin: Math.round(userMargin),
      userAvgVisitsPerDay: Math.round(userAvgVisitsPerDay * 10) / 10,
      userNoShowRate: Math.round(userNoShowRate),
      metrics,
    };
  }

  async getGoalProgress(userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get user's goal
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyGoal: true },
    });

    if (!user?.monthlyGoal) {
      return null;
    }

    const goal = Number(user.monthlyGoal);

    // Get current month summary
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const totalDaysInMonth = endDate.getDate();
    const currentDay = now.getDate();
    const daysLeft = totalDaysInMonth - currentDay;

    const snapshots = await this.prisma.dailySnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const current = snapshots.reduce((sum, s) => sum + Number(s.netProfit), 0);
    const remaining = Math.max(0, goal - current);
    const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : 0;

    // Project based on current pace
    const daysWorked = snapshots.length;
    const avgDaily = daysWorked > 0 ? current / daysWorked : 0;
    const projectedTotal = current + avgDaily * daysLeft;

    const percentComplete = goal > 0 ? (current / goal) * 100 : 0;
    const percentOfMonth = (currentDay / totalDaysInMonth) * 100;

    // Determine if on track
    // On track if: progress % >= month progress % - 10
    const onTrack = percentComplete >= percentOfMonth - 10;

    return {
      goal,
      current: Math.round(current),
      remaining: Math.round(remaining),
      daysLeft,
      dailyNeeded: Math.round(dailyNeeded),
      projectedTotal: Math.round(projectedTotal),
      onTrack,
      percentComplete: Math.round(percentComplete),
    };
  }

  async getMonthlyTrend(userId: string, months: number = 6) {
    const now = new Date();
    const results: Array<{
      year: number;
      month: number;
      netProfit: number;
      revenue: number;
      visits: number;
    }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const snapshots = await this.prisma.dailySnapshot.findMany({
        where: {
          userId,
          snapshotDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totals = snapshots.reduce(
        (acc, s) => ({
          netProfit: acc.netProfit + Number(s.netProfit),
          revenue: acc.revenue + Number(s.revenue),
          visits: acc.visits + s.visitCount,
        }),
        { netProfit: 0, revenue: 0, visits: 0 },
      );

      results.push({
        year,
        month,
        ...totals,
      });
    }

    return results;
  }

  async setGoal(userId: string, goal: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { monthlyGoal: goal },
    });

    return { success: true, goal };
  }

  async reopenDay(userId: string, date: string) {
    const snapshotDate = new Date(date);

    // Check if day is closed
    const existing = await this.prisma.dailySnapshot.findUnique({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate,
        },
      },
    });

    if (!existing) {
      throw new BadRequestException('Ten dzień nie jest zamknięty');
    }

    // Delete the snapshot
    await this.prisma.dailySnapshot.delete({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate,
        },
      },
    });

    return { success: true, date };
  }
}
