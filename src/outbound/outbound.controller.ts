import { Controller, Get, Post, Put, Body, Param } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import { OutboundService } from "./outbound.service"
import { CreatePickListDto } from "./dto/create-pick-list.dto"
import { UpdateOutboundShipmentDto } from "./dto/update-outbound-shipment.dto"
import { OutboundQueryDto } from "./dto/outbound-query.dto"

@ApiTags("outbound")
@Controller("api/outbound")
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Get()
  @ApiOperation({ summary: "Get all outbound shipments" })
  @ApiResponse({ status: 200, description: "List of outbound shipments" })
  async findAll(query: OutboundQueryDto) {
    return this.outboundService.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get outbound shipment by ID' })
  @ApiResponse({ status: 200, description: 'Outbound shipment details' })
  async findOne(@Param('id') id: string) {
    return this.outboundService.findOne(id);
  }

  @Post('pick-list')
  @ApiOperation({ summary: 'Generate pick list' })
  @ApiResponse({ status: 201, description: 'Pick list generated' })
  async generatePickList(@Body() createPickListDto: CreatePickListDto) {
    return this.outboundService.generatePickList(createPickListDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update outbound shipment" })
  @ApiResponse({ status: 200, description: "Outbound shipment updated" })
  async update(@Param('id') id: string, @Body() updateOutboundShipmentDto: UpdateOutboundShipmentDto) {
    return this.outboundService.update(id, updateOutboundShipmentDto)
  }

  @Put(":id/pick")
  @ApiOperation({ summary: "Update picking status" })
  @ApiResponse({ status: 200, description: "Picking status updated" })
  async updatePickingStatus(@Param('id') id: string, @Body() body: { pickerId: string; status: string }) {
    return this.outboundService.updatePickingStatus(id, body.pickerId, body.status)
  }

  @Put(":id/ship")
  @ApiOperation({ summary: "Mark as shipped" })
  @ApiResponse({ status: 200, description: "Shipment marked as shipped" })
  async markAsShipped(@Param('id') id: string, @Body() body: { carrier: string; trackingNumber: string }) {
    return this.outboundService.markAsShipped(id, body.carrier, body.trackingNumber)
  }
}
