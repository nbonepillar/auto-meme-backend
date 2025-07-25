import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TradeHistory } from "./trade-history.entity";
import { TradeHistoryService } from "./trade-history.service";

@Module({
  imports: [TypeOrmModule.forFeature([TradeHistory])],
  controllers: [],
  providers: [TradeHistoryService],
  exports: [TradeHistoryService],
})
export class TradeHistoryModule {}
