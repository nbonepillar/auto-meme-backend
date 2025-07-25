import { forwardRef, Module } from "@nestjs/common";

import { TradingService } from "@workers/trading/trading.service";
import { LiFiCrossChainService } from "@workers/trading/cross-chain/lifi-crosschain.service";
import { EthereumTradingService } from "@workers/trading/ethereum/ethereum-trading.service";
import { SolanaTradingService } from "@workers/trading/solana/solana-trading.service";
import { TradeHistoryModule } from "@databases/trade-history/trade-history.module";
import { BinanceTradingService } from "@workers/trading/binance/binance-trading.service";
import { WalletsModule } from "@databases/wallets/wallets.module";
import { TransactionModule } from "@databases/transactions/transactions.module";

@Module({
  imports: [TradeHistoryModule, TransactionModule, WalletsModule],
  providers: [
    TradingService,
    SolanaTradingService,
    EthereumTradingService,
    BinanceTradingService,
    LiFiCrossChainService,
  ],
  exports: [TradingService, LiFiCrossChainService],
})
export class TradingModule {}
