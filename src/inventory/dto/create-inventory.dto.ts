import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Storage location', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Available quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  quantityAvailable: number;

  @ApiProperty({
    description: 'Reserved quantity',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityReserved?: number;
}
