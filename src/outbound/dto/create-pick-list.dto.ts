import { IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreatePickListDto {
  @ApiProperty({ description: "Order ID to generate pick list for" })
  @IsString()
  orderId: string
}
