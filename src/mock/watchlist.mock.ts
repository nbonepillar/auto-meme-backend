// Mock data and interfaces for watchlist tokens

/**
 * Represents a token in the user's watchlist with key statistics and metadata.
 */
export interface WatchlistToken {
  /** Token image URL */
  coin_img: string;
  /** Token name */
  name: string;
  /** Token contract or mint address */
  address: string;
  /** Age of the token (e.g., '7d') */
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
 * Mock list of watchlist tokens for development/testing purposes.
 */
export const mockWatchlist: WatchlistToken[] = [
  {
    coin_img: "https://example.com/img/watchcoin.png",
    name: "WatchMemeCoin",
    address: "0xwatch123",
    age: "7d",
    liquidity: 20000,
    mc: 1500000,
    holders: 2345,
    price: 0.02,
    "1h_vol": 1000,
    "6h_vol": 4000,
    "24h_vol": 16000,
    degen_audit: "pending",
  },
  // You can add more watchlist tokens here
];
