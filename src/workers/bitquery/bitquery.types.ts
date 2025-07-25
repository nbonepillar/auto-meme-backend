export enum TradeMethod {
  buy = "buy",
  sell = "sell",
}

export type BaseTokenInfo = {
  symbol: string;
  name: string;
  address: string;
  network: string;
  degen_audit: string;
  uri: string;
  total_supply: number;
  created_at: number;
};

/**
 * Common type of trade information
 */
export type BaseTokenTrade = {
  method: string;
  time: string;
  buy: {
    amount: string;
    amountInUSD: string;
    account: string;
    decimals: number;
    address: string;
    name: string;
    symbol: string;
  };
  sell: {
    amount: string;
    amountInUSD: string;
    account: string;
    decimals: number;
    address: string;
    name: string;
    symbol: string;
  };
  txHash: string;
};

/**
 * Type of Solana TokenSupplyUpdate, newly created tokens
 */
export type SolanaTokenCreatedRawType = {
  Solana: {
    TokenSupplyUpdates: SolanaTokenSupplyUpdate[];
  };
};

export type SolanaTokenSupplyUpdate = {
  Block: {
    Time: string;
  };
  Transaction: {
    Signer: string;
  };
  TokenSupplyUpdate: {
    Amount: string;
    Currency: {
      Decimals: number;
      EditionNonce: number;
      Fungible: boolean;
      IsMutable: boolean;
      Key: string;
      MetadataAddress: string;
      MintAddress: string;
      Name: string;
      Native: boolean;
      PrimarySaleHappened: boolean;
      ProgramAddress: string;
      Symbol: string;
      TokenStandard: string;
      UpdateAuthority: string;
      Uri: string;
      VerifiedCollection: boolean;
      Wrapped: boolean;
    };
    PostBalance: string;
  };
};

/**
 * Types of Solana token trade
 */

export type SolanaDexTrade = {
  Block: {
    Time: string;
  };
  Instruction: {
    Program: {
      Method: string;
    };
  };
  Trade: {
    Buy: {
      Account: {
        Address: string;
        Owner: string;
      };
      Amount: string;
      AmountInUSD: string;
      Currency: {
        Decimals: number;
        Fungible: boolean;
        MintAddress: string;
        Name: string;
        Symbol: string;
        Uri: string;
      };
    };
    Dex: {
      ProtocolFamily: string;
      ProtocolName: string;
    };
    Sell: {
      Account: {
        Address: string;
        Owner: string;
      };
      Amount: string;
      AmountInUSD: string;
      Currency: {
        Decimals: number;
        Fungible: boolean;
        MintAddress: string;
        Name: string;
        Symbol: string;
        Uri: string;
      };
    };
  };
  Transaction: {
    Signature: string;
  };
};

export type SolanaTokenTradeRawType = {
  Solana: {
    DEXTrades: SolanaDexTrade[];
  };
};

/**
 * Types for Solana completing, migrated tokens
 */
export type SolanaMarketedTokenRawType = {
  Pool: {
    Market: {
      BaseCurrency: {
        MintAddress: string;
        Symbol: string;
        Name: string;
        Uri: string;
      };
    };
    Quote: {
      PostAmount: number;
    };
  };
};

export type SolanaTokenCompletingRawType = {
  Solana: {
    completingTokens: SolanaMarketedTokenRawType[];
    migratedTokens: SolanaMarketedTokenRawType[];
  };
};

export type SolanaTokenDetailRawType = {
  Solana: {
    TokenDetail: {
      Block: {
        Time: string;
      };
      volumeUSD: string;
      tradeCount: string;
      Trade: {
        currentPrice: number;
        Currency: {
          MintAddress: string;
        };
      };
    }[];
  };
};

/**
 * Types of BSC token create
 */
export type BscTokenCreateRawType = {
  EVM: {
    Transfers: BscTokenSupplyUpdate[];
  };
};

export type BscTokenSupplyUpdate = {
  Block: {
    Time: string;
  };
  Transfer: {
    Amount: string;
    Type: string;
    URI: string;
    Currency: {
      Decimals: number;
      Name: string;
      Symbol: string;
      SmartContract: string;
    };
  };
};

/**
 * Types of BSC Token Trade
 */
export type BscTokenTradeRawType = {
  EVM: {
    DEXTrades: BscDexTrade[];
  };
};

export type BscDexTrade = {
  Block: {
    Time: string;
  };
  Trade: {
    Buy: {
      Buyer: string;
      Amount: string;
      AmountInUSD: string;
      Currency: {
        Decimals: number;
        Name: string;
        SmartContract: string;
        Symbol: string;
      };
    };
    Sell: {
      Seller: string;
      Amount: string;
      AmountInUSD: string;
      Currency: {
        Decimals: number;
        Name: string;
        SmartContract: string;
        Symbol: string;
      };
    };
  };
  Transaction: {
    Hash: string;
  };
};

/**
 * Types of BSC Token Completed query
 */
export type BscCompletedRawType = {
  EVM: {
    Events: {
      Arguments: {
        Name: string;
        Value: { address?: string; bigInteger?: string };
      }[];
      Block: {
        Hash: string;
        Number: string;
        Time: string;
      };
    }[];
  };
};

/**
 * Types of BSC Token completed detail query
 */

export type BscCompletedTokenRawDetail = {
  EVM: {
    P: BscCompletedTokenCurrencyInfo[];
  };
};

export type BscCompletedTokenCurrencyInfo = {
  Trade: {
    Currency: {
      Name: string;
      Symbol: string;
      SmartContract: string;
    };
    PriceInUSD: string;
  };
  Block: {
    Time: string;
  };
};

export type BscCompletedTokenVolumeInfo = {
  Trade: {
    Currency: {
      SmartContract: string;
    };
  };
  trades_1hr: number;
  trades_24hr: string;
  trades_6hr: string;
  volume_1hr: string;
  volume_24hr: string;
  volume_6hr: string;
};

export type BscCompletedTokenHolderInfo = {
  Trade: {
    Currency: {
      SmartContract: string;
    };
  };
  buys: string;
  count: string;
  sells: string;
};

export type EthereumPoolCreateArgument = {
  Name: string;
  Type: string;
  Value: {
    address?: string;
    bigInteger?: number;
  };
};

export type EthereumTokenCreatedRawType = {
  EVM: {
    Events: {
      Arguments: EthereumPoolCreateArgument[];
      Log: {
        SmartContract: String;
      };
      Transaction: {
        Hash: string;
      };
      Block: {
        Time: string;
      };
    }[];
  };
};
