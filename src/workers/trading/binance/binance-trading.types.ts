export interface BSCTokenInfo {
  version: number;
  tokenManager: `0x${string}`;
  quote: `0x${string}`;
  lastPrice: bigint;
  tradingFeeRate: bigint;
  minTradingFee: bigint;
  launchTime: bigint;
  offers: bigint;
  maxOffers: bigint;
  funds: bigint;
  maxFunds: bigint;
  liquidityAdded: boolean;
}

export interface BSCBuyParams {
  tokenManager: `0x${string}`;
  quote: `0x${string}`;
  estimatedAmount: bigint;
  estimatedCost: bigint;
  estimatedFee: bigint;
  amountMsgValue: bigint;
  amountApproval: bigint;
  amountFunds: bigint;
}
