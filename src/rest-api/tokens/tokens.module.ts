import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tokens } from "@databases/tokens/tokens.entity";
import { DashboardController } from "@rest-api/tokens/dashboard.controller";
import { TokenDetailController } from "@rest-api/tokens/token-detail.controller";
import { TokenController } from "@rest-api/tokens/tokens.controller";
import { TokensService } from "@databases/tokens/tokens.service";
import { Transaction } from "@databases/transactions/transactions.entity";
import { TokenPriceHistory } from "@databases/token_price_history/token_price_history.entity";
import { TokenHolders } from "@databases/token_holders/token_holders.entity";
import { TradingController } from "@rest-api/tokens/trading.controller";
import { TradingModule } from "@workers/trading/trading.module";
import { TrendingController } from "@rest-api/tokens/trending.controller";
import { WatchlistController } from "@rest-api/tokens/watchlist.controller";
import { TradeHistory } from "@databases/trade-history/trade-history.entity";
import { TradeHistoryModule } from "@databases/trade-history/trade-history.module";
import { WalletsModule } from "@databases/wallets/wallets.module";
import { TransactionModule } from "@databases/transactions/transactions.module";
import { SearchController } from "./search.controller";
import { LimitsModule } from "@databases/limits/limits.module";
import { TokenSummaryModule } from "@databases/token_analyze_summary/token-summary.module";

@Module({
  // imports: [TypeOrmModule.forFeature([Token, TokenPriceHistory, TokenHolders, Transaction]), TrendingModule],
  imports: [
    TypeOrmModule.forFeature([
      Tokens,
      TokenPriceHistory,
      TokenHolders,
      Transaction,
      TradeHistory,
    ]),
    TradingModule,
    TradeHistoryModule,
    WalletsModule,
    TransactionModule,
    TokenSummaryModule,
    LimitsModule,
  ],
  controllers: [
    TokenController,
    DashboardController,
    TrendingController,
    WatchlistController,
    TokenDetailController,
    SearchController,
    TradingController,
  ],
  providers: [TokensService],
  exports: [TypeOrmModule, TokensService],
})
export class TokenModule {}
