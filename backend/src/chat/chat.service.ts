import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  private n8nWebhookUrl: string | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.n8nWebhookUrl = this.configService.get<string>('N8N_CHAT_WEBHOOK_URL') || null;
  }

  async sendMessage(userId: string, message: string, sessionId?: string) {
    const currentSessionId = sessionId || uuidv4();

    // Save user message
    await this.prisma.chatMessage.create({
      data: {
        userId,
        sessionId: currentSessionId,
        role: 'user',
        content: message,
      },
    });

    // Get user context
    const context = await this.getUserContext(userId);

    // Get chat history for this session
    const history = await this.prisma.chatMessage.findMany({
      where: { userId, sessionId: currentSessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Generate AI response
    let assistantMessage: string;

    if (this.n8nWebhookUrl) {
      assistantMessage = await this.callN8nWebhook(context, history, message, currentSessionId);
    } else {
      assistantMessage = this.generateMockResponse(context, message);
    }

    // Save assistant message
    const savedMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        sessionId: currentSessionId,
        role: 'assistant',
        content: assistantMessage,
      },
    });

    return {
      sessionId: currentSessionId,
      message: savedMessage,
    };
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
      { revenue: 0, netProfit: 0, materialCosts: 0, visitCount: 0, noShowCount: 0, noShowCost: 0, daysWorked: 0 },
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
      { revenue: 0, netProfit: 0, visitCount: 0, noShowCount: 0, noShowCost: 0, daysWorked: 0 },
    );

    // Get today's visits
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayVisits = await this.prisma.visit.findMany({
      where: {
        userId,
        visitDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        service: {
          select: { name: true, price: true },
        },
      },
    });

    // Check if today is closed
    const todaySnapshot = await this.prisma.dailySnapshot.findFirst({
      where: {
        userId,
        snapshotDate: todayStart,
      },
    });

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

    // Format today's visits for context
    const todayVisitsSummary = todayVisits.map((v) => ({
      service: v.service.name,
      price: Number(v.actualPrice ?? v.service.price),
      status: v.status,
    }));

    const todayRevenue = todayVisits
      .filter((v) => v.status === 'completed')
      .reduce((sum, v) => sum + Number(v.actualPrice ?? v.service.price), 0);

    return {
      user,
      monthSummary,
      prevMonthSummary,
      services: servicesWithProfit,
      fixedCosts: fixedCosts.map((c) => ({ name: c.name, amount: Number(c.amount) })),
      totalFixedCosts,
      currentMonth: now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
      previousMonth: prevStartOfMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
      today,
      todayVisits: todayVisitsSummary,
      todayRevenue,
      todayVisitCount: todayVisits.filter((v) => v.status === 'completed').length,
      todayNoShowCount: todayVisits.filter((v) => v.status === 'no_show').length,
      isDayClosed: !!todaySnapshot,
    };
  }

  private async callN8nWebhook(
    context: Awaited<ReturnType<typeof this.getUserContext>>,
    history: Array<{ role: string; content: string }>,
    currentMessage: string,
    sessionId: string,
  ): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for AI responses

      const response = await fetch(this.n8nWebhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          sessionId,
          context: {
            user: context.user,
            monthSummary: context.monthSummary,
            prevMonthSummary: context.prevMonthSummary,
            services: context.services,
            fixedCosts: context.fixedCosts,
            totalFixedCosts: context.totalFixedCosts,
            currentMonth: context.currentMonth,
            previousMonth: context.previousMonth,
            today: context.today,
            todayVisits: context.todayVisits,
            todayRevenue: context.todayRevenue,
            todayVisitCount: context.todayVisitCount,
            todayNoShowCount: context.todayNoShowCount,
            isDayClosed: context.isDayClosed,
          },
          history: history.map((h) => ({
            role: h.role,
            content: h.content,
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`n8n webhook HTTP error: ${response.status}`);
        // Fallback to mock response if n8n fails
        return this.generateMockResponse(context, currentMessage);
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error('n8n webhook returned empty response');
        return this.generateMockResponse(context, currentMessage);
      }

      const data = JSON.parse(text);
      return data.response || data.output || data.message || this.generateMockResponse(context, currentMessage);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('n8n webhook timeout after 60s - AI response took too long');
          return `${context.user?.name ? context.user.name + ', p' : 'P'}rzepraszam, odpowiedz AI trwala zbyt dlugo. Sprobuj ponownie lub zadaj prostsze pytanie.`;
        }
        console.error('n8n webhook error:', error.message);
      } else {
        console.error('n8n webhook error:', error);
      }
      // Fallback to mock response on any error
      return this.generateMockResponse(context, currentMessage);
    }
  }

  private generateMockResponse(
    context: Awaited<ReturnType<typeof this.getUserContext>>,
    message: string,
  ): string {
    const lowerMessage = message.toLowerCase();
    const userName = context.user?.name || '';

    // Ile dziś zarobiłam?
    if (lowerMessage.includes('dziś') || lowerMessage.includes('dzis') || lowerMessage.includes('dzisiaj')) {
      if (context.todayVisitCount === 0) {
        return `${userName ? userName + ', ' : ''}nie masz jeszcze zalogowanych wizyt na dzisiaj.

Kliknij na usluge w zakladce Wizyty, zeby dodac wizyte.

Chcesz zobaczyc jak wyglada caly miesiac?`;
      }
      return `${userName ? userName + ', d' : 'D'}zis masz ${context.todayVisitCount} wizyt${context.todayVisitCount === 1 ? 'e' : ''} i zarobek ${context.todayRevenue.toFixed(0)} zl brutto.

${context.isDayClosed ? '✅ Dzien zamkniety.' : 'Pamietaj zeby zamknac dzien przed wyjsciem!'}

Chcesz porownac z poprzednim tygodniem?`;
    }

    // Ile kosztują mnie no-show?
    if (lowerMessage.includes('no-show') || lowerMessage.includes('nieodwol') || lowerMessage.includes('kosztuj')) {
      const noShowCost = context.monthSummary.noShowCost;
      if (context.monthSummary.noShowCount === 0) {
        return `${userName ? userName + ', g' : 'G'}ratulacje! 🎉 W tym miesiacu nie masz zadnych no-show.

To znaczy ze Twoje klientki sa zdyscyplinowane albo masz dobry system przypominania.

Chcesz zobaczyc ktora usluga zarabia najlepiej?`;
      }
      return `${userName ? userName + ', w' : 'W'} ${context.currentMonth} masz ${context.monthSummary.noShowCount} no-show.

Strata: ${noShowCost.toFixed(0)} zl — to kwota ktora moglas zarobic.

Kilka sposobow na zmniejszenie no-show:
- Wyslij SMS przypomnienie dzien przed
- Wprowadz zaliczki (np. 50 zl)
- Polityka: odwolanie min. 24h wczesniej

Chcesz zebym napisala szablon wiadomosci przypominajacej?`;
    }

    // Która usługa zarabia najlepiej?
    if (lowerMessage.includes('uslug') || lowerMessage.includes('zarabia') || lowerMessage.includes('ranking') || lowerMessage.includes('najlep')) {
      const sortedServices = [...context.services].sort((a, b) => b.profitPerHour - a.profitPerHour);
      const best = sortedServices[0];
      const worst = sortedServices[sortedServices.length - 1];

      if (!best) {
        return `${userName ? userName + ', n' : 'N'}ie masz jeszcze uslug w cenniku. Dodaj je w Ustawieniach.`;
      }

      return `${userName ? userName + ', T' : 'T'}woj ranking uslug wg zysku na godzine:

${sortedServices.map((s, i) => `${i + 1}. ${s.name}: ${s.profitPerHour} zl/h (cena ${s.price} zl, ${s.durationMinutes} min)`).join('\n')}

🏆 Najlepsza: ${best.name} — ${best.profitPerHour} zl/h
${sortedServices.length > 1 ? `📉 Najslabsza: ${worst.name} — ${worst.profitPerHour} zl/h` : ''}

Chcesz zasymulowac podwyzke cen?`;
    }

    // Porównanie miesięcy
    if (lowerMessage.includes('porownaj') || lowerMessage.includes('poprzedni')) {
      const revChange = context.prevMonthSummary.revenue > 0
        ? ((context.monthSummary.revenue - context.prevMonthSummary.revenue) / context.prevMonthSummary.revenue * 100).toFixed(0)
        : '∞';
      const profitChange = context.prevMonthSummary.netProfit > 0
        ? ((context.monthSummary.netProfit - context.prevMonthSummary.netProfit) / context.prevMonthSummary.netProfit * 100).toFixed(0)
        : '∞';

      return `${userName ? userName + ', p' : 'P'}orownam ${context.currentMonth} z ${context.previousMonth}:

**Przychod:**
- Teraz: ${context.monthSummary.revenue.toFixed(0)} zl
- Wczesniej: ${context.prevMonthSummary.revenue.toFixed(0)} zl
- Zmiana: ${revChange}%

**Zysk netto:**
- Teraz: ${context.monthSummary.netProfit.toFixed(0)} zl
- Wczesniej: ${context.prevMonthSummary.netProfit.toFixed(0)} zl
- Zmiana: ${profitChange}%

${Number(profitChange) > 0 ? '📈 Swietnie, idziesz w gore!' : Number(profitChange) < 0 ? '📉 Spadek — warto przeanalizowac przyczyny.' : ''}

Chcesz sie dowiedziec jak zwiekszyc zysk?`;
    }

    // Default - powitanie
    return `Czesc${userName ? ' ' + userName : ''}! 👋

Jestem Koly, Twoj asystent biznesowy. Pomoge Ci analizowac finanse i zarabiac wiecej.

Zapytaj mnie o:
- Ile dzis zarobilas
- Ktora usluga zarabia najlepiej
- Ile kosztuja Cie no-show
- Porownanie z poprzednim miesiacem

⚠️ *Tryb offline — skonfiguruj N8N_CHAT_WEBHOOK_URL zeby polaczyc z pelnym AI*`;
  }

  async getHistory(userId: string, sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { userId, sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.chatMessage.groupBy({
      by: ['sessionId'],
      where: { userId },
      _max: { createdAt: true },
      _count: { id: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: 5,
    });

    // Get first user message for each session as preview
    const sessionsWithPreview = await Promise.all(
      sessions.map(async (s) => {
        const firstUserMessage = await this.prisma.chatMessage.findFirst({
          where: {
            sessionId: s.sessionId,
            role: 'user',
          },
          orderBy: { createdAt: 'asc' },
          select: { content: true },
        });

        return {
          sessionId: s.sessionId,
          lastActivity: s._max.createdAt,
          messageCount: s._count.id,
          preview: firstUserMessage?.content?.substring(0, 50) || 'Nowa rozmowa',
        };
      }),
    );

    return sessionsWithPreview;
  }
}
