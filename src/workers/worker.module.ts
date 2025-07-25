import { Module } from "@nestjs/common";
import { WorkerService } from "@workers/worker.service";

import { BitQueryService } from "@workers/bitquery/bitquery.service";
import { SolTokenService } from "@workers/bitquery/sol-token.service";
import { BscTokenService } from "@workers/bitquery/bsc-token.service";
import { EtherTokenService } from "@workers/bitquery/ether-token.service";

import { DataTransformerService } from "@workers/bitquery/data-transformer.service";
import { CompletedTokensService } from "@workers/bitquery/completed-tokens.service";
import { TradingModule } from "@workers/trading/trading.module";
import { TokenSummaryModule } from "@databases/token_analyze_summary/token-summary.module";

@Module({
  imports: [TradingModule, TokenSummaryModule],
  providers: [
    SolTokenService,
    BscTokenService,
    EtherTokenService,
    WorkerService,
    BitQueryService,
    DataTransformerService,
    CompletedTokensService,
  ],
  exports: [TradingModule],
})
export class WorkerModule {}
