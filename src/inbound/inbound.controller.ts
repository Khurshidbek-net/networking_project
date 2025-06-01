import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InboundService } from './inbound.service';
import { CreateInboundShipmentDto } from './dto/create-inbound-shipment.dto';
import { UpdateInboundShipmentDto } from './dto/update-inbound-shipment.dto';
import { InboundQueryDto } from './dto/inbound-query.dto';

@ApiTags('inbound')
@Controller('api/inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inbound shipments' })
  @ApiResponse({ status: 200, description: 'List of inbound shipments' })
  async findAll(query: InboundQueryDto) {
    return this.inboundService.findAll(query);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending receipts' })
  @ApiResponse({ status: 200, description: 'List of pending receipts' })
  async getPendingReceipts() {
    return this.inboundService.getPendingReceipts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inbound shipment by ID' })
  @ApiResponse({ status: 200, description: 'Inbound shipment details' })
  async findOne(@Param('id') id: string) {
    return this.inboundService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new inbound shipment' })
  @ApiResponse({ status: 201, description: 'Inbound shipment created' })
  async create(@Body() createInboundShipmentDto: CreateInboundShipmentDto) {
    return this.inboundService.create(createInboundShipmentDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inbound shipment' })
  @ApiResponse({ status: 200, description: 'Inbound shipment updated' })
  async update(
    @Param('id') id: string,
    @Body() updateInboundShipmentDto: UpdateInboundShipmentDto,
  ) {
    return this.inboundService.update(id, updateInboundShipmentDto);
  }

  @Put(':id/receive')
  @ApiOperation({ summary: 'Mark shipment as received' })
  @ApiResponse({ status: 200, description: 'Shipment marked as received' })
  async markAsReceived(@Param('id') id: string) {
    return this.inboundService.markAsReceived(id);
  }
}
