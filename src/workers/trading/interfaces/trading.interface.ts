// trading/interfaces/trading.interface.ts
export interface TradingResult {
  success: boolean;
  transactionHashes: string[];
  outputAmount?: string;
  gasUsed?: string;
  error?: string;
  tradeId?: string;
}

export interface CrossChainQuote {
  route: any; // LiFi route object
  estimatedGas: string;
  estimatedTime: number;
  bridgeFee: string;
}
