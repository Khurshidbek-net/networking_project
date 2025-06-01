import { Injectable } from '@nestjs/common';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) { }
  async create(createWarehouseDto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: {
        name: createWarehouseDto.name,
        address: createWarehouseDto.address,
        totalCapacity: createWarehouseDto.totalCapacity,
        usedCapacity: createWarehouseDto.usedCapacity,
        zones: createWarehouseDto.zones,
      },
    });
  }

  async findAll() {
    return await this.prisma.warehouse.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.warehouse.findUnique({ where: { id } });
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto) {
    return await this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    return await this.prisma.warehouse.delete({ where: { id } })
  }
}
