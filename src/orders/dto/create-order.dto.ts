import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderPriority } from '@prisma/client';

class CreateOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantity ordered', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantityOrdered: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Customer email', required: false })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ description: 'Customer phone', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ description: 'Shipping address', required: false })
  @IsOptional()
  shippingAddress?: any;

  @ApiProperty({
    description: 'Order priority',
    enum: OrderPriority,
    required: false,
    default: OrderPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @ApiProperty({ description: 'Due date', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Order notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Order items', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];
}
