import { SolanaTokenSummary } from "@databases/token_analyze_summary/entities/solana-token-summary.entity";
import { TokenSummaryResponse } from "@databases/token_analyze_summary/types/token-summary-response.type";

export enum RedisTokenKeyType {
  new = "new", // new created tokens
  completing = "com", // completing tokens
  migrated = "mig", // migrated tokens
  trending = "trending", // trending tokens
  monitoring = "monitoring", // need monitoring tokens (tokens in token details, watch-list, trending)
}

export function getStatusFromTokenKeyType(type: RedisTokenKeyType) {
  switch (type) {
    case RedisTokenKeyType.new:
      return 0;
    case RedisTokenKeyType.completing:
      return 1;
    case RedisTokenKeyType.migrated:
      return 2;
    default:
      return 0;
  }
}

export type TokenTradeCoreType = {
  tx: string;
  is_buy: boolean;
  token: string;
  total_usd: number;
  amount: number;
  price: number;
  wallet: string;
  time: string;
};
