import { IsString, IsInt, IsEnum, IsOptional, Min } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class AdjustInventoryDto {
  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string

  @ApiProperty({ description: "Warehouse ID" })
  @IsString()
  warehouseId: string

  @ApiProperty({
    description: "Adjustment type",
    enum: ["increase", "decrease", "count"],
  })
  @IsEnum(["increase", "decrease", "count"])
  adjustmentType: "increase" | "decrease" | "count"

  @ApiProperty({ description: "Quantity to adjust", minimum: 0 })
  @IsInt()
  @Min(0)
  quantity: number

  @ApiProperty({ description: "Reason for adjustment", required: false })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiProperty({ description: "User ID performing adjustment", required: false })
  @IsOptional()
  @IsString()
  userId?: string
}
