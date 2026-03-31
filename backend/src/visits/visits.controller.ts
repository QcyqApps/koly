import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@Controller('visits')
@UseGuards(JwtAuthGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createVisitDto: CreateVisitDto) {
    return this.visitsService.create(user.id, createVisitDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.visitsService.findAll(user.id);
  }

  @Get('date/:date')
  findByDate(@CurrentUser() user: User, @Param('date') date: string) {
    return this.visitsService.findByDate(user.id, date);
  }

  @Get('range')
  findByDateRange(
    @CurrentUser() user: User,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    return this.visitsService.findByDateRange(user.id, startDate, endDate);
  }

  @Get('summary/:date')
  getDaySummary(@CurrentUser() user: User, @Param('date') date: string) {
    return this.visitsService.getDaySummary(user.id, date);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.visitsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateVisitDto: UpdateVisitDto,
  ) {
    return this.visitsService.update(user.id, id, updateVisitDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.visitsService.remove(user.id, id);
  }
}
