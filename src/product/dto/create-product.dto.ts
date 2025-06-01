import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateProductDto {

  @ApiProperty({ description: "Product name" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Product description", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Product category ID", required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: "Product unit price", required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ description: "Product weight", required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ description: "Product dimensions", required: false })
  @IsOptional()
  dimensions?: object;

  @ApiProperty({ description: "Product minimum stock", required: false })
  @IsOptional()
  @IsNumber()
  minimumStock?: number;

  @ApiProperty({ description: "Product is active", required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}