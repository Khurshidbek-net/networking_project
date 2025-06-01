import { IsOptional, IsString, IsInt, IsEnum, Min } from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"
import { OrderStatus, OrderPriority } from "@prisma/client"

export class OrderQueryDto {
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
    description: "Order status filter",
    enum: OrderStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus

  @ApiProperty({
    description: "Order priority filter",
    enum: OrderPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority
}
