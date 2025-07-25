import { forwardRef, Module } from "@nestjs/common";
import { ManRedisService } from "./redis.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transaction } from "@databases/transactions/transactions.entity";
import { TransactionModule } from "../databases/transactions/transactions.module";
import { TokenSummaryModule } from "@databases/token_analyze_summary/token-summary.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    forwardRef(() => TransactionModule),
    TokenSummaryModule,
  ],
  providers: [ManRedisService],
  exports: [ManRedisService],
})
export class ManRedisModule {}
