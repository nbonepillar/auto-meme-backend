// Mock data and interfaces for trending tokens

/**
 * Represents a trending token with key statistics and metadata.
 */
export interface TrendingToken {
  /** Token image URL */
  coin_img: string;
  /** Token name */
  name: string;
  /** Token contract or mint address */
  address: string;
  /** Age of the token (e.g., '3d') */
  age: string;
  /** Current liquidity */
  liquidity: number;
  /** Market capitalization */
  mc: number;
  /** Number of holders */
  holders: number;
  /** Current price */
  price: number;
  /** 1-hour trading volume */
  "1h_vol": number;
  /** 6-hour trading volume */
  "6h_vol": number;
  /** 24-hour trading volume */
  "24h_vol": number;
  /** Degen audit result or label */
  degen_audit: string;
}

/**
 * Mock list of trending tokens for populating trending views in development/testing.
 */
export const trendingMockTokens: TrendingToken[] = [
  {
    coin_img: "https://example.com/img/trendcoin.png",
    name: "TrendMemeCoin",
    address: "0xtrend123",
    age: "3d",
    liquidity: 50000,
    mc: 3000000,
    holders: 4567,
    price: 0.05,
    "1h_vol": 3000,
    "6h_vol": 12000,
    "24h_vol": 48000,
    degen_audit: "passed",
  },
  // You can add more trending tokens here
];
