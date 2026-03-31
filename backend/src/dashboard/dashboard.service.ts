import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface SuggestionResponse {
  suggestion: string;
  category: 'finance' | 'marketing' | 'operations' | 'growth';
  generatedAt: string;
}

@Injectable()
export class DashboardService {
  private n8nSuggestionWebhookUrl: string | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.n8nSuggestionWebhookUrl =
      this.configService.get<string>('N8N_SUGGESTION_WEBHOOK_URL') || null;
  }

  async getSuggestion(userId: string): Promise<SuggestionResponse> {
    const context = await this.getUserContext(userId);

    if (this.n8nSuggestionWebhookUrl) {
      return this.callN8nWebhook(context);
    }

    return this.generateMockSuggestion(context);
  }

  private async getUserContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        businessName: true,
        industry: true,
        city: true,
        taxForm: true,
        taxRate: true,
        zusMonthly: true,
      },
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get current month summary
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const snapshots = await this.prisma.dailySnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const monthSummary = snapshots.reduce(
      (acc, s) => ({
        revenue: acc.revenue + Number(s.revenue),
        netProfit: acc.netProfit + Number(s.netProfit),
        materialCosts: acc.materialCosts + Number(s.materialCosts),
        visitCount: acc.visitCount + s.visitCount,
        noShowCount: acc.noShowCount + s.noShowCount,
        noShowCost: acc.noShowCost + Number(s.noShowCost),
        daysWorked: acc.daysWorked + 1,
      }),
      {
        revenue: 0,
        netProfit: 0,
        materialCosts: 0,
        visitCount: 0,
        noShowCount: 0,
        noShowCost: 0,
        daysWorked: 0,
      },
    );

    // Get previous month summary
    const prevStartOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEndOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const prevSnapshots = await this.prisma.dailySnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: prevStartOfMonth,
          lte: prevEndOfMonth,
        },
      },
    });

    const prevMonthSummary = prevSnapshots.reduce(
      (acc, s) => ({
        revenue: acc.revenue + Number(s.revenue),
        netProfit: acc.netProfit + Number(s.netProfit),
        visitCount: acc.visitCount + s.visitCount,
        noShowCount: acc.noShowCount + s.noShowCount,
        noShowCost: acc.noShowCost + Number(s.noShowCost),
        daysWorked: acc.daysWorked + 1,
      }),
      {
        revenue: 0,
        netProfit: 0,
        visitCount: 0,
        noShowCount: 0,
        noShowCost: 0,
        daysWorked: 0,
      },
    );

    // Get services with profit per hour calculation
    const services = await this.prisma.service.findMany({
      where: { userId, isActive: true },
      select: { name: true, price: true, durationMinutes: true, materialCost: true },
    });

    const servicesWithProfit = services.map((s) => {
      const profit = Number(s.price) - Number(s.materialCost);
      const profitPerHour = s.durationMinutes > 0 ? (profit / s.durationMinutes) * 60 : 0;
      return {
        ...s,
        price: Number(s.price),
        materialCost: Number(s.materialCost),
        profit,
        profitPerHour: Math.round(profitPerHour),
      };
    });

    // Get fixed costs
    const fixedCosts = await this.prisma.fixedCost.findMany({
      where: { userId, isActive: true },
      select: { name: true, amount: true },
    });

    const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      user,
      monthSummary,
      prevMonthSummary,
      services: servicesWithProfit,
      fixedCosts: fixedCosts.map((c) => ({ name: c.name, amount: Number(c.amount) })),
      totalFixedCosts,
      currentMonth: now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
      previousMonth: prevStartOfMonth.toLocaleDateString('pl-PL', {
        month: 'long',
        year: 'numeric',
      }),
      today,
    };
  }

  private async callN8nWebhook(
    context: Awaited<ReturnType<typeof this.getUserContext>>,
  ): Promise<SuggestionResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(this.n8nSuggestionWebhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'dashboard_suggestion',
          context: {
            user: context.user,
            monthSummary: context.monthSummary,
            prevMonthSummary: context.prevMonthSummary,
            services: context.services,
            fixedCosts: context.fixedCosts,
            totalFixedCosts: context.totalFixedCosts,
            currentMonth: context.currentMonth,
            previousMonth: context.previousMonth,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`n8n suggestion webhook HTTP error: ${response.status}`);
        return this.generateMockSuggestion(context);
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error('n8n suggestion webhook returned empty response');
        return this.generateMockSuggestion(context);
      }

      const data = JSON.parse(text);
      return {
        suggestion: data.suggestion || this.generateMockSuggestion(context).suggestion,
        category: data.category || 'finance',
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('n8n suggestion webhook timeout');
        } else {
          console.error('n8n suggestion webhook error:', error.message);
        }
      }
      return this.generateMockSuggestion(context);
    }
  }

  private generateMockSuggestion(
    context: Awaited<ReturnType<typeof this.getUserContext>>,
  ): SuggestionResponse {
    const { monthSummary, prevMonthSummary, services } = context;

    // Check for no-shows
    if (monthSummary.noShowCount > 0 && monthSummary.noShowCost > 100) {
      return {
        suggestion: `Twoje no-show w tym miesiacu kosztuja ${monthSummary.noShowCost.toFixed(0)} zl. Rozwaz wprowadzenie zaliczek online lub przypomnienia SMS dzien przed wizyta.`,
        category: 'operations',
        generatedAt: new Date().toISOString(),
      };
    }

    // Check for revenue growth opportunity
    if (prevMonthSummary.revenue > 0 && monthSummary.revenue < prevMonthSummary.revenue * 0.9) {
      const drop = (
        ((prevMonthSummary.revenue - monthSummary.revenue) / prevMonthSummary.revenue) *
        100
      ).toFixed(0);
      return {
        suggestion: `Przychod spadl o ${drop}% w porownaniu do poprzedniego miesiaca. Rozwaz promocje dla stalych klientek lub post na Instagramie z wolnymi terminami.`,
        category: 'marketing',
        generatedAt: new Date().toISOString(),
      };
    }

    // Best service recommendation
    if (services.length > 0) {
      const bestService = [...services].sort((a, b) => b.profitPerHour - a.profitPerHour)[0];
      return {
        suggestion: `Usluga "${bestService.name}" ma najwyzsza marze (${bestService.profitPerHour} zl/h). Promuj ja mocniej na social media lub rozwaz podniesienie ceny o 10%.`,
        category: 'finance',
        generatedAt: new Date().toISOString(),
      };
    }

    // Default growth suggestion
    if (monthSummary.revenue > 8000) {
      return {
        suggestion: `Swietny miesiac! Przy przychodzie ${monthSummary.revenue.toFixed(0)} zl mozesz myslec o zatrudnieniu asystentki lub rozszerzeniu oferty.`,
        category: 'growth',
        generatedAt: new Date().toISOString(),
      };
    }

    return {
      suggestion: `Dodaj wiecej uslug do cennika i zacznij zamykac dni, zeby Koly mogla lepiej analizowac Twoj biznes.`,
      category: 'operations',
      generatedAt: new Date().toISOString(),
    };
  }
}
