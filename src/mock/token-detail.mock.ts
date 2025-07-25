// Mock data and interfaces for detailed token information

/**
 * List of mock token addresses for which detailed data is available.
 */
export const mockDetailAddresses = ["0xtrump123"];

/**
 * Represents a single entry in a token's price chart.
 */
export interface PriceChartEntry {
  /** ISO timestamp for the price entry */
  timestamp: string;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
}

/**
 * Represents a single activity (trade or event) for a token.
 */
export interface ActivityInfo {
  /** Age of the activity (e.g., '11s') */
  age: string;
  /** Type of activity (e.g., 'Sell', 'Buy') */
  type: string;
  /** Total USD value (nullable) */
  total_usd: number | null;
  /** Amount traded */
  amount: number;
  /** Price at which the activity occurred (nullable) */
  price: number | null;
  /** Maker address or identifier */
  maker: string;
}

/**
 * Represents a token holder's information.
 */
export interface HolderInfo {
  /** Holder's address */
  address: string;
  /** Percentage of total supply held */
  percent: string;
  /** Token balance held by the address */
  balance: number;
  /** Last activity timestamp */
  last_activity: string;
  /** Optional label for the holder (e.g., exchange name) */
  label: string;
}

/**
 * Represents current summary information for a token.
 */
export interface CurrentInfo {
  /** Market capitalization (string, e.g., '$10.82B') */
  mkt_cap: string;
  /** Liquidity (string, e.g., '$500.7M') */
  liq: string;
  /** 24-hour trading volume (string) */
  vol_24h: string;
  /** Number of holders (string) */
  holders: string;
  /** List of trading pairs and their values */
  pair: { symbol: string; value: string; initial: string }[];
  /** List of token values in different currencies */
  value: { symbol: string; value: string }[];
  /** Whether the token can be minted */
  no_mint: boolean;
  /** Whether the token is blacklisted */
  blacklist: boolean;
  /** Whether the token is burnt */
  burnt: boolean;
  /** Percentage held by top 10 holders */
  top10: string;
}

/**
 * Mock detailed token data including price chart, activity, holders, and current info.
 * Used for populating the token detail view in development/testing.
 */
export const tokenDetailMockData = {
  price_chart: [
    {
      timestamp: "2024-06-01T08:00:00Z",
      open: 10.8,
      high: 10.9,
      low: 10.7,
      close: 10.85,
      volume: 120,
    },
  ],
  activity_info: [
    {
      age: "11s",
      type: "Sell",
      total_usd: null,
      amount: 49.1,
      price: null,
      maker: "AasGT...mDX",
    },
  ],
  holder_list: [
    {
      address: "2RH6r...FSK",
      percent: "8.0%",
      balance: 5.61,
      last_activity: "2024-03-09T23:18:30Z",
      label: "Binance",
    },
  ],
  current_info: {
    mkt_cap: "$10.82B",
    liq: "$500.7M",
    vol_24h: "$31M",
    holders: "628.3K",
    pair: [
      { symbol: "TRUMP", value: "11.2M", initial: "0" },
      { symbol: "USDC", value: "250.3M", initial: "0" },
    ],
    value: [
      { symbol: "TRUMP", value: "$121M" },
      { symbol: "USDC", value: "$38.5B" },
    ],
    no_mint: true,
    blacklist: false,
    burnt: false,
    top10: "9.96%",
  },
};
