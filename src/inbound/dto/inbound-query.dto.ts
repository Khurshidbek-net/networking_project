import { IsOptional, IsString, IsInt, IsEnum, Min } from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"
import { ShipmentStatus } from "@prisma/client"

export class InboundQueryDto {
  @ApiProperty({ description: "Page number", required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiProperty({ description: "Items per page", required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10

  @ApiProperty({ description: "Search term", required: false })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({
    description: "Shipment status filter",
    enum: ShipmentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus
}
