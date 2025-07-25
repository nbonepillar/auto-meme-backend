// Raw message interfaces for data coming from external sources before processing

/**
 * Represents a raw Solana token message as received from external sources (e.g., WebSocket).
 * Used before transformation into structured TokenData.
 */
export interface NetworkTokenServiceInterface {
  initializeCompletingTokens(): void;
  getTokenCreates(): void;
  getTokenTrades(): void;
}
