import { IsOptional, IsString, IsEnum, IsDateString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { OutboundStatus } from "@prisma/client"

export class UpdateOutboundShipmentDto {
  @ApiProperty({ description: "Carrier name", required: false })
  @IsOptional()
  @IsString()
  carrier?: string

  @ApiProperty({ description: "Tracking number", required: false })
  @IsOptional()
  @IsString()
  trackingNumber?: string

  @ApiProperty({
    description: "Shipment status",
    enum: OutboundStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OutboundStatus)
  status?: OutboundStatus

  @ApiProperty({ description: "Picker ID", required: false })
  @IsOptional()
  @IsString()
  pickerId?: string

  @ApiProperty({ description: "Packed by user ID", required: false })
  @IsOptional()
  @IsString()
  packedBy?: string

  @ApiProperty({ description: "Estimated delivery date", required: false })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string
}
