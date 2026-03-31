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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.servicesService.findAll(userId);
  }

  @Get('active')
  async findActive(@CurrentUser('id') userId: string) {
    return this.servicesService.findActive(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.servicesService.findOne(userId, id);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(userId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.servicesService.remove(userId, id);
  }

  @Patch(':id/favorite')
  async toggleFavorite(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.servicesService.toggleFavorite(userId, id);
  }
}
