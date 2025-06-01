import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CreateInboundShipmentItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Expected quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantityExpected: number;

  @ApiProperty({ description: 'Unit cost', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreateInboundShipmentDto {
  @ApiProperty({ description: 'Supplier name' })
  @IsString()
  supplierName: string;

  @ApiProperty({ description: 'Supplier contact information', required: false })
  @IsOptional()
  supplierContact?: any;

  @ApiProperty({ description: 'Purchase order number', required: false })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiProperty({ description: 'Expected delivery date', required: false })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Shipment items',
    type: [CreateInboundShipmentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInboundShipmentItemDto)
  items: CreateInboundShipmentItemDto[];
}
