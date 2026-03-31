import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const DEMO_EMAIL = 'demo@koly.app';
const DEMO_PASSWORD = 'demo-password-not-used';

// Demo data configuration
const DEMO_FIXED_COSTS = [
  { name: 'Czynsz lokalu', amount: 1500 },
  { name: 'Media', amount: 300 },
  { name: 'Internet', amount: 80 },
  { name: 'Ubezpieczenie', amount: 100 },
  { name: 'Środki czystości', amount: 150 },
];

const DEMO_SERVICES = [
  { name: 'Manicure hybrydowy', price: 130, durationMinutes: 75, materialCost: 15 },
  { name: 'Pedicure hybrydowy', price: 150, durationMinutes: 90, materialCost: 20 },
  { name: 'Zdjęcie hybrydy', price: 50, durationMinutes: 20, materialCost: 5 },
  { name: 'Przedłużanie żelem', price: 200, durationMinutes: 120, materialCost: 30 },
];

@Injectable()
export class DemoService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateDemoUser() {
    // Check if demo user exists
    let user = await this.prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });

    if (user) {
      return user;
    }

    // Create demo user
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    user = await this.prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash,
        name: 'Anna Demo',
        businessName: 'Studio Paznokci Demo',
        industry: 'nails',
        city: 'Warszawa',
        taxForm: 'ryczalt',
        taxRate: 8.5,
        zusMonthly: 380,
        onboardingCompleted: true,
        isDemo: true,
      },
    });

    // Seed demo data
    await this.seedDemoData(user.id);

    return user;
  }

  async seedDemoData(userId: string) {
    // Clear existing data for this user
    await this.prisma.visit.deleteMany({ where: { userId } });
    await this.prisma.service.deleteMany({ where: { userId } });
    await this.prisma.fixedCost.deleteMany({ where: { userId } });
    await this.prisma.dailySnapshot.deleteMany({ where: { userId } });

    // Create fixed costs
    await this.prisma.fixedCost.createMany({
      data: DEMO_FIXED_COSTS.map((cost) => ({
        userId,
        name: cost.name,
        amount: cost.amount,
        isActive: true,
      })),
    });

    // Create services
    const services = await Promise.all(
      DEMO_SERVICES.map((service) =>
        this.prisma.service.create({
          data: {
            userId,
            name: service.name,
            price: service.price,
            durationMinutes: service.durationMinutes,
            materialCost: service.materialCost,
            isActive: true,
            isFavorite: service.name === 'Manicure hybrydowy',
          },
        }),
      ),
    );

    // Generate visits for the last 30 days
    const visits: Prisma.VisitCreateManyInput[] = [];
    const now = new Date();

    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      const visitDate = new Date(now);
      visitDate.setDate(visitDate.getDate() - daysAgo);
      visitDate.setHours(0, 0, 0, 0);

      // Skip some days randomly (weekends more likely)
      const dayOfWeek = visitDate.getDay();
      if (dayOfWeek === 0) continue; // Sunday - closed
      if (dayOfWeek === 6 && Math.random() > 0.3) continue; // Saturday - sometimes closed

      // Generate 1-4 visits per day
      const visitsPerDay = Math.floor(Math.random() * 4) + 1;

      for (let i = 0; i < visitsPerDay; i++) {
        const service = services[Math.floor(Math.random() * services.length)];
        const isNoShow = Math.random() < 0.05; // 5% no-show rate

        visits.push({
          userId,
          serviceId: service.id,
          visitDate,
          status: isNoShow ? 'no_show' : 'completed',
          actualPrice: isNoShow ? null : Number(service.price),
        });
      }
    }

    if (visits.length > 0) {
      await this.prisma.visit.createMany({ data: visits });
    }
  }

  async resetDemoData() {
    const user = await this.prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });

    if (user) {
      await this.seedDemoData(user.id);
    }
  }
}
