import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FixedCostsModule } from './fixed-costs/fixed-costs.module';
import { ServicesModule } from './services/services.module';
import { CategoriesModule } from './categories/categories.module';
import { VisitsModule } from './visits/visits.module';
import { DayModule } from './day/day.module';
import { ChatModule } from './chat/chat.module';
import { GalleryModule } from './gallery/gallery.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute (general API usage)
      },
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 25, // 25 attempts per minute for auth (testing)
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FixedCostsModule,
    ServicesModule,
    CategoriesModule,
    VisitsModule,
    DayModule,
    ChatModule,
    GalleryModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
