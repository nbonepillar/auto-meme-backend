// Mock data and interfaces for token search results

/**
 * Represents a token returned in search results with key statistics and metadata.
 */
export interface SearchToken {
  /** Token image URL */
  img: string;
  /** Token name */
  name: string;
  /** Token contract or mint address */
  address: string;
  /** 24-hour trading volume */
  "24h_vol": number;
  /** Current liquidity */
  liquidity: number;
  /** 24-hour market capitalization */
  "24h_mc": number;
}

/**
 * Mock list of tokens for search results in development/testing.
 */
export const searchMockTokens: SearchToken[] = [
  {
    img: "https://example.com/img/token1.png",
    name: "TrumpMemeCoin",
    address: "0xtrump123",
    "24h_vol": 31000,
    liquidity: 500000,
    "24h_mc": 10820000000,
  },
  {
    img: "https://example.com/img/token2.png",
    name: "BidenMemeCoin",
    address: "0xbiden456",
    "24h_vol": 15000,
    liquidity: 200000,
    "24h_mc": 5200000000,
  },
  {
    img: "https://example.com/img/token3.png",
    name: "ElonMemeCoin",
    address: "0xelon789",
    "24h_vol": 5000,
    liquidity: 100000,
    "24h_mc": 1200000000,
  },
  // You can add more tokens here
];
