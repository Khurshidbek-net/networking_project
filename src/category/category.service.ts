import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateCategoryDto) {
    return await this.prisma.category.create({
      data: dto,
    });
  }

  async findAll() {
    return await this.prisma.category.findMany({
      include: { children: true, parent: true, products: true },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true, products: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    return await this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return await this.prisma.category.delete({
      where: { id },
    });
  }
}
