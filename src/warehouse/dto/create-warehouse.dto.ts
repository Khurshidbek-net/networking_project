import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateWarehouseDto {

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  totalCapacity: number;

  @ApiProperty()
  @IsNumber()
  usedCapacity: number;


  @ApiProperty()
  @IsNotEmpty()
  zones: any;
}
