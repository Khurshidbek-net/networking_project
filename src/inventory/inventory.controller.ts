import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@ApiTags('inventory')
@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiResponse({ status: 200, description: 'List of inventory items' })
  async findAll(query: InventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiResponse({ status: 200, description: 'List of low stock items' })
  async getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get inventory analytics' })
  @ApiResponse({ status: 200, description: 'Inventory analytics data' })
  async getAnalytics() {
    return this.inventoryService.getAnalytics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiResponse({ status: 200, description: 'Inventory item details' })
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new inventory item' })
  @ApiResponse({ status: 201, description: 'Inventory item created' })
  async create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item updated' })
  async update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust inventory levels' })
  @ApiResponse({ status: 200, description: 'Inventory adjusted' })
  async adjustInventory(@Body() adjustInventoryDto: AdjustInventoryDto) {
    return this.inventoryService.adjustInventory(adjustInventoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item deleted' })
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
