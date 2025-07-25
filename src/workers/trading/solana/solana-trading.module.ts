import { Module } from "@nestjs/common";
import { SolanaTradingService } from "./solana-trading.service";

@Module({
  providers: [SolanaTradingService],
  exports: [SolanaTradingService], // Export so other services can use it
})
export class SolanaTradingModule {}
