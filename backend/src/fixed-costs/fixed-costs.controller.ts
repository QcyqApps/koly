import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FixedCostsService } from './fixed-costs.service';
import { CreateFixedCostDto } from './dto/create-fixed-cost.dto';
import { UpdateFixedCostDto } from './dto/update-fixed-cost.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('fixed-costs')
export class FixedCostsController {
  constructor(private fixedCostsService: FixedCostsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.fixedCostsService.findAll(userId);
  }

  @Get('total')
  async getTotal(@CurrentUser('id') userId: string) {
    const total = await this.fixedCostsService.getTotal(userId);
    return { total };
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fixedCostsService.findOne(userId, id);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFixedCostDto,
  ) {
    return this.fixedCostsService.create(userId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFixedCostDto,
  ) {
    return this.fixedCostsService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fixedCostsService.remove(userId, id);
  }
}
