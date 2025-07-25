import { IsString, IsNumber } from "class-validator";

export class CreateLimitOrderDto {
  @IsString()
  wallet_address!: string;
  @IsString()
  network!: string;
  @IsString()
  token_address!: string;
  @IsString()
  order_price?: number;
  @IsNumber()
  mc?: number;
  @IsString()
  action?: string; // "buy" or "sell"
  @IsNumber()
  amount_in!: number;
  @IsString()
  order_type!: string;
  @IsString()
  status!: string;
  @IsString()
  extra?: string; // tp/sl config
}
