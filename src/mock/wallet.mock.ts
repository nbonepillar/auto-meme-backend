export interface WalletInfo {
  wallet_address: string;
  network: string;
  token_name: string;
  token_address: string;
  price: number;
  balance: number;
}

export interface HistoryInfo {
  token: string;
  network: string;
  price: number;
  amount: number;
  payment_detail: string;
  trade_type: string;
  time: string;
}

export interface ReferralInfo {
  referal_id: string;
  invited_cnt: number;
  friends_list: FriendInfo[];
  t_vol: number;
}

export interface FriendInfo {
  friend_id: string;
  friend_name: string;
  friend_img: string;
  friend_address: string;
}

export interface PnlInfo {
  pnl_rate: number;
  pnl_amount: number;
}

export const walletMockData = {
  wallet_info: [
    {
      wallet_address: "0xwallet123",
      network: "Ethereum",
      token_name: "TrumpMemeCoin",
      token_address: "0xtrump123",
      price: 10.82,
      balance: 1000,
    },
    {
      wallet_address: "0xwallet456",
      network: "Solana",
      token_name: "SolMemeCoin",
      token_address: "0xsol123",
      price: 2.15,
      balance: 500,
    },
  ],
  history_info: [
    {
      token: "TrumpMemeCoin",
      network: "Ethereum",
      price: 10.8,
      amount: 100,
      payment_detail: "ETH",
      trade_type: "Buy",
      time: "2024-06-01T08:00:00Z",
    },
    {
      token: "SolMemeCoin",
      network: "Solana",
      price: 2.1,
      amount: 50,
      payment_detail: "SOL",
      trade_type: "Sell",
      time: "2024-05-30T10:30:00Z",
    },
  ],
  referal_info: {
    referal_id: "ref123",
    invited_cnt: 2,
    friends_list: [
      {
        friend_id: "friend1",
        friend_name: "Alice",
        friend_img: "https://example.com/img/alice.png",
        friend_address: "0xalice123",
      },
      {
        friend_id: "friend2",
        friend_name: "Bob",
        friend_img: "https://example.com/img/bob.png",
        friend_address: "0xbob456",
      },
    ],
    t_vol: 5000,
  },
  pnl_info: {
    pnl_rate: 12.5,
    pnl_amount: 1500,
  },
};
