import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class NetworkInputDto {
  @ApiProperty()
  @IsEnum(['all', 'sol', 'eth', 'bsc'], { message: 'Invalid network' })
  network: string = 'all';
}