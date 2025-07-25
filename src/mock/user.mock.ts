// Mock data and interfaces for user information

/**
 * Represents user information for mock data.
 */
export interface UserInfo {
  /** User's email address */
  email_address: string;
  /** User's profile image URL */
  image_url: string;
  /** Last login timestamp (ISO string) */
  last_login: string;
  /** Number of wallets associated with the user */
  wallet_cnt: number;
}

/**
 * Mock user ID for which mock data is available.
 */
export const userMockId = "0xuser123";

/**
 * Mock user data for development/testing purposes.
 */
export const userMockData: UserInfo = {
  email_address: "user@example.com",
  image_url: "https://example.com/user.png",
  last_login: "2024-06-01T12:00:00Z",
  wallet_cnt: 2,
};
