// Mock data and interfaces for dashboard token lists

/**
 * Represents a token displayed on the dashboard, including metadata and statistics.
 */
export interface DashboardToken {
  /** Token name */
  name: string;
  /** Token description */
  description: string;
  /** Token contract or mint address */
  address: string;
  /** ISO timestamp string for the token event or creation */
  time: string;
  /** Token image URL */
  img: string;
  /** Social network link (e.g., Twitter) */
  socialnet: string;
  /** Status code or score for the token */
  status: number;
  /** Percentage of top 10 holders */
  top10holders: number;
  /** Percentage of tokens held by developers */
  dev_holders: number;
  /** Number of snipers detected */
  snipernum: number;
}

/**
 * Mock dashboard data for new, community, and migrated tokens.
 * Used for populating the dashboard view in development/testing.
 */
export const dashboardMockData = {
  tokens_new: [
    {
      name: "NewMemeCoin",
      description: "Brand new meme coin",
      address: "0xabc123",
      time: "2024-06-01T00:00:00Z",
      img: "https://example.com/img/newmemecoin.png",
      socialnet: "https://twitter.com/newmemecoin",
      status: 85,
      top10holders: 12.3,
      dev_holders: 2.1,
      snipernum: 42,
    },
    // You can add more items here
  ],
  tokens_com: [
    {
      name: "CommunityMemeCoin",
      description: "Popular in the community",
      address: "0xdef456",
      time: "2024-05-20T00:00:00Z",
      img: "https://example.com/img/communitymemecoin.png",
      socialnet: "https://twitter.com/communitymemecoin",
      status: 67,
      top10holders: 15.7,
      dev_holders: 3.4,
      snipernum: 17,
    },
  ],
  tokens_mig: [
    {
      name: "MigratedMemeCoin",
      description: "Migrated from another chain",
      address: "0x789ghi",
      time: "2024-04-15T00:00:00Z",
      img: "https://example.com/img/migratedmemecoin.png",
      socialnet: "https://twitter.com/migratedmemecoin",
      status: 92,
      top10holders: 9.8,
      dev_holders: 1.2,
      snipernum: 5,
    },
  ],
};
