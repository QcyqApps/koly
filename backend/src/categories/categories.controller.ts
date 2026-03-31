import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.categoriesService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.findOne(userId, id);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(userId, dto);
  }

  @Patch('reorder')
  async reorder(
    @CurrentUser('id') userId: string,
    @Body() dto: ReorderCategoriesDto,
  ) {
    return this.categoriesService.reorder(userId, dto.categoryIds);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.remove(userId, id);
  }
}
