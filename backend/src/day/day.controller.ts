import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsNumber, Min } from 'class-validator';
import { DayService } from './day.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

class CloseDayDto {
  @IsDateString()
  date: string;
}

class SetGoalDto {
  @IsNumber()
  @Min(0)
  goal: number;
}

@Controller('day')
@UseGuards(JwtAuthGuard)
export class DayController {
  constructor(private readonly dayService: DayService) {}

  @Post('close')
  closeDay(@CurrentUser() user: User, @Body() dto: CloseDayDto) {
    return this.dayService.closeDay(user.id, dto.date);
  }

  @Get('snapshot/:date')
  getSnapshot(@CurrentUser() user: User, @Param('date') date: string) {
    return this.dayService.getSnapshot(user.id, date);
  }

  @Get('snapshots')
  getSnapshots(
    @CurrentUser() user: User,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    return this.dayService.getSnapshots(user.id, startDate, endDate);
  }

  @Get('month/:year/:month')
  getMonthSummary(
    @CurrentUser() user: User,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.dayService.getMonthSummary(user.id, parseInt(year), parseInt(month));
  }

  @Get('monthly-trend')
  getMonthlyTrend(
    @CurrentUser() user: User,
    @Query('months') months?: string,
  ) {
    return this.dayService.getMonthlyTrend(user.id, months ? parseInt(months) : 6);
  }

  @Get('goal-progress')
  getGoalProgress(@CurrentUser() user: User) {
    return this.dayService.getGoalProgress(user.id);
  }

  @Post('goal')
  setGoal(@CurrentUser() user: User, @Body() dto: SetGoalDto) {
    return this.dayService.setGoal(user.id, dto.goal);
  }

  @Get('benchmark')
  getBenchmark(@CurrentUser() user: User) {
    return this.dayService.getBenchmark(user.id);
  }

  @Post('reopen')
  reopenDay(@CurrentUser() user: User, @Body() dto: CloseDayDto) {
    return this.dayService.reopenDay(user.id, dto.date);
  }
}
