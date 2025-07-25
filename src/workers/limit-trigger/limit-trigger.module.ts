import { forwardRef, Module } from "@nestjs/common";

import { LimitsModule } from "@databases/limits/limits.module";
import { LimitTriggerService } from "@workers/limit-trigger/limit-trigger.service";
import { TradingModule } from "@workers/trading/trading.module";
import { WalletsModule } from "@databases/wallets/wallets.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Limits } from "@databases/limits/limits.entity";
import { TransactionModule } from "@databases/transactions/transactions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Limits]),
    LimitsModule,
    forwardRef(() => TradingModule),
    WalletsModule,
    TransactionModule,
  ],
  providers: [LimitTriggerService],
  exports: [LimitTriggerService],
})
export class LimitTriggerModule {}
