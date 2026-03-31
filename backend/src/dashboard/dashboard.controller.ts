import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { User } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('suggestion')
  async getSuggestion(@Request() req: { user: User }) {
    return this.dashboardService.getSuggestion(req.user.id);
  }
}
