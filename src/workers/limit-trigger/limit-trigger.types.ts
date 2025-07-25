export type TriggerCondition = {
  triggerType: "limit" | "stop";
  triggerPrice: number;
  triggerAmount: number;
};

export enum OrderType {
  LIMIT = "LIMIT",
  STOP = "STOP",
}

export enum TriggerStatus {
  PENDING = 0,
  ORDERING = 1,
  EXECUTED = 2,
  FAILED = 3,
  CANCELLED = 4,
}

// TPSL configuration for a single position
export interface TPSLPositionConfig {
  userId: string;
  walletAddress: string;
  tokenAddress: string;
  network: string;
  orderType: "buy" | "sell";
  expectedAmount: number;
  expectedTxHash: string; // If we know the expected tx hash
  tpslSettings: TPSLSetting[];
  createdAt: Date;
  expiresAt: Date;
}

// Individual TP/SL setting (can have multiple per position for partial liquidation)
export interface TPSLSetting {
  trigger_value: number;
  sell_percentage?: number;
}
