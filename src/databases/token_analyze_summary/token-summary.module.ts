import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SolanaTokenSummary } from "./entities/solana-token-summary.entity";
import { TokenSummaryService } from "./token-summary.service";
import { EthereumTokenSummary } from "./entities/ethereum-token-summary.entity";
import { BSCTokenSummary } from "./entities/bsc-token-summary.entity";
import { TokenHolders } from "@databases/token_holders/token_holders.entity";
import { TokenTrending } from "./entities/token-trending.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolanaTokenSummary,
      EthereumTokenSummary,
      BSCTokenSummary,
      TokenHolders,
      TokenTrending,
    ]),
  ],
  providers: [TokenSummaryService],
  exports: [TokenSummaryService],
})
export class TokenSummaryModule {}
