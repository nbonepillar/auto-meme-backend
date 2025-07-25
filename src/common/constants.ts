export const SOLANA_NATIVE_ADDRESS = "11111111111111111111111111111111";
export const PUMPFUN_NATIVE_ADDRESS =
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const FILE_PATH = "myFile.txt";

// export const mutex = new Mutex();

export const SOLANA_TOKEN_CREATE_SUBSCRIPTION = `
  subscription {
    Solana {
      TokenSupplyUpdates(
        where: {Instruction: {Program: {Address: {is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"}, Method: {is: "create"}}}}
      ) {
        Block {
          Time
        }
        Transaction {
          Signer
        }
        TokenSupplyUpdate {
          Amount
          Currency {
            Symbol
            ProgramAddress
            PrimarySaleHappened
            Native
            Name
            MintAddress
            MetadataAddress
            Key
            IsMutable
            Fungible
            EditionNonce
            Decimals
            Wrapped
            VerifiedCollection
            Uri
            UpdateAuthority
            TokenStandard
            TokenCreator {
              Address
            }
          }
          PostBalance
        }
      }
    }
  }
`;

export const SOLANA_TOKEN_TRADE_SUBSCRIPTION = `
  subscription MyQuery {
    Solana {
      DEXTrades(
        where: {Trade: {Dex: {ProtocolName: {is: "pump"}}}, Transaction: {Result: {Success: true}}}
      ) {
        Instruction {
          Program {
            Method
          }
        }
        Trade {
          Dex {
            ProtocolFamily
            ProtocolName
          }
          Buy {
            Amount
            AmountInUSD
            Account {
              Address
              Owner
            }
            Currency {
              Name
              Symbol
              MintAddress
              Decimals
              Fungible
              Uri
            }
          }
          Sell {
            Amount
            AmountInUSD
            Account {
              Address
              Owner
            }
            Currency {
              Name
              Symbol
              MintAddress
              Decimals
              Fungible
              Uri
            }
          }
        }
        Transaction {
          Signature
        }
        Block {
          Time
        }
      }
    }
  }
`;

export const SOLANA_TOKEN_COMPLETED_QUERY = `
  query GetMigratedTokens {
    Solana {
      migratedTokens: DEXPools(
        where: {Pool: {Dex: {ProgramAddress: {is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"}}, Base: {PostAmount: {le: "206900000"}}}}
        limitBy: {by: Pool_Market_BaseCurrency_MintAddress, count: 1}
        orderBy: {descending: Block_Time}
        limit: {count: 50}
      ) {
        Pool {
          Market {
            BaseCurrency {
              MintAddress
              Symbol
              Name
              Uri
            }
          }
          Quote {
            PostAmount
          }
        }
      }
      completingTokens: DEXPools(
        where: {
          Pool: {
            Dex: {
              ProgramAddress: {
                is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
              }
            },
          Base: { PostAmount: { gt: "206900000", lt: "286555000" } }
          }
        }
        limitBy: { by: Pool_Market_BaseCurrency_MintAddress, count: 1 }
        orderBy: {descending: Block_Time}
        limit: {count: 50}
      ) {
        Pool {
          Market {
            BaseCurrency {
              MintAddress
              Symbol
              Name
              Uri
            }
          }
          Quote {
            PostAmount
          }
        }
      }
    }
  }
`;

export const SOLANA_TOKEN_DETAIL_QUERY = `
  query GetTokensInfo($tokens: [String!]!) {
    Solana {
      TokenDetail: DEXTradeByTokens(
        where: {Trade: {Currency: {MintAddress: {in: $tokens}}}}
        limitBy: {by: Trade_Currency_MintAddress, count: 1}
      ) {
        volumeUSD: sum(of: Trade_Side_AmountInUSD)
        tradeCount: count
        Trade {
          currentPrice: PriceInUSD(maximum: Block_Slot)
          Currency {
            MintAddress
          }
        }
        Block {
          Time(minimum: Block_Time)
        }
      }
    }
  }
`;

export const ETHEREUM_TOKEN_CREATE_SUBSCRIPTION = `
  subscription {
    EVM(network: eth) {
      Events(
        orderBy: {descending: Block_Number}
        where: {Log: {SmartContract: {in: ["0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0x1f98431c8ad98523631ae4a59f267346ea31f984"]}, Signature: {Name: {in: ["PoolCreated", "PairCreated"]}}}, Arguments: {includes: {Value: {Address: {is: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}}}}}
      ) {
        Log {
          SmartContract
        }
        Transaction {
          Hash
        }
        Arguments {
          Type
          Value {
            ... on EVM_ABI_Boolean_Value_Arg {
              bool
            }
            ... on EVM_ABI_Bytes_Value_Arg {
              hex
            }
            ... on EVM_ABI_BigInt_Value_Arg {
              bigInteger
            }
            ... on EVM_ABI_Address_Value_Arg {
              address
            }
            ... on EVM_ABI_String_Value_Arg {
              string
            }
            ... on EVM_ABI_Integer_Value_Arg {
              integer
            }
          }
          Name
        }
        Block {
          Time
        }
      }
    }
  }
`;

export const ETHEREUM_TOKEN_TRADE_SUBSCRIPTION = `
  subscription {
    EVM(network: eth) {
      DEXTrades(where: {TransactionStatus: {Success: true}, Trade: {Dex: {ProtocolName: {includesCaseInsensitive: "uniswap"}}}}) {
        Trade {
          Buy {
            Buyer
            Currency {
              Name
              Symbol
              SmartContract
              Decimals
            }
            Amount
            AmountInUSD
          }
          Sell {
            Seller
            Currency {
              Name
              Symbol
              SmartContract
              Decimals
            }
            Amount
            AmountInUSD
          }
        }
        Transaction {
          Hash
        }
        Block {
          Time
        }
      }
    }
  }
`;

export const BSC_TOKEN_CREATE_SUBSCRIPTION = `
  subscription {
    EVM(network: bsc) {
      Transfers(
        orderBy: {descending: Block_Time}
        limit: {count: 1}
        where: {Transaction: {To: {is: "0x5c952063c7fc8610ffdb798152d69f0b9550762b"}}, Transfer: {Sender: {is: "0x0000000000000000000000000000000000000000"}}}
      ) {
        Transfer {
          Amount
          Type
          URI
          Currency {
            Name
            Symbol
            SmartContract
            Decimals
          }
        }
        Block {
          Time
        }
      }
    }
  }
`;

export const BSC_TOKEN_TRADE_SUBSCRIPTION = `
  subscription {
    EVM(network: bsc) {
      DEXTrades(where: {Trade: {Dex: {ProtocolName: {is: "fourmeme_v1"}}}}) {
        Trade {
          Buy {
            Buyer
            Currency {
              Name
              Symbol
              SmartContract
              Decimals
            }
            Amount
            AmountInUSD
          }
          Sell {
            Seller
            Currency {
              Name
              Symbol
              SmartContract
              Decimals
            }
            Amount
            AmountInUSD
          }
        }
        Transaction {
          Hash
        }
        Block {
          Time
        }
      }
    }
  }
`;

export const BSC_TOKEN_COMPLETING_QUERY = `
  query MyQuery {
    EVM(dataset: combined, network: bsc) {
      BalanceUpdates(
        limit: {count: 20}
        where: {BalanceUpdate: {Address: {is: "0x5c952063c7fc8610FFDB798152D69F0B9550762b"}}}
        orderBy: {descendingByField: "balance"}
      ) {
        Currency {
          Symbol
          SmartContract
          Name
        }
        balance: sum(
          of: BalanceUpdate_Amount
          selectWhere: { ge: "280000000", le: "840000000" }
        )
        Block {
          Time(minimum: Block_Time)
        }
      }
    }
  }
`;

export const BSC_TOKEN_COMPLETED_QUERY = `
query MyQuery($fromDate: String) {
 EVM(dataset: combined, network: bsc) {
    Events(
      limit: {count: 50}
      where: {
        Block: {Date: {since: $fromDate}},
        LogHeader: {Address: {in: "0x5c952063c7fc8610ffdb798152d69f0b9550762b"}},
        Log: {Signature: {Name: {is: "LiquidityAdded"}}}
      }
      orderBy: {descending: Block_Number}
    ) {
      Block {
        Time
        Number
        Hash
      }
      Arguments {
        Name
        Value {
          ... on EVM_ABI_Integer_Value_Arg {
            integer
          }
          ... on EVM_ABI_Address_Value_Arg {
            address
          }
          ... on EVM_ABI_String_Value_Arg {
            string
          }
          ... on EVM_ABI_BigInt_Value_Arg {
            bigInteger
          }
          ... on EVM_ABI_Bytes_Value_Arg {
            hex
          }
          ... on EVM_ABI_Boolean_Value_Arg {
            bool
          }
        }
      }
    }
  }
}
`;

export const BSC_TOKEN_DETAIL_QUERY = `
  query MyQuery($currency: [String!]!) {
    EVM(network: bsc, dataset: combined) {
      P: DEXTradeByTokens(
        where: {Trade: {Currency: {SmartContract: {in: $currency}}, Success: true}}
        limitBy: {count: 1, by: Trade_Currency_SmartContract}
      ) {
        Trade {
          PriceInUSD
          Currency {
            SmartContract
            Name
            Symbol
          }
        }
        Block {
          Time(minimum: Block_Time)
        }
      }
    }
  }
`;

//  Vol: DEXTradeByTokens(
//     where: {
//       Trade: {
//           Currency: {SmartContract: {in: $currency}},
//           Success: true
//       },
//       Block: {Time: {since: $time_24hr_ago}}
//     }
//   ) {
//     Trade{
//       Currency {
//         Name
//         Symbol
//         SmartContract
//       }
//     }
//     volume_24hr: sum(of: Trade_Side_AmountInUSD)
//     volume_6hr: sum(of: Trade_Side_AmountInUSD, if: {Block: {Time: {since: $time_6hr_ago}}})
//     volume_1hr: sum(of: Trade_Side_AmountInUSD, if: {Block: {Time: {since: $time_1hr_ago}}})
//     trades_24hr: count
//     trades_6hr: count(if: {Block: {Time: {since: $time_6hr_ago}}})
//     trades_1hr: count(if: {Block: {Time: {since: $time_1hr_ago}}})
//   }
//   Cnt: DEXTradeByTokens(
//     where: {
//       Trade: {Currency: {SmartContract: {in: $currency}}},
//       TransactionStatus: {Success: true},
//       Block: {
//         Time: {since: "2020-01-01T00:00:00Z"}
//       }
//     }
//   ) {
//     Trade {
//       Currency {
//         SmartContract
//       }
//     }
//     count
//     buys: count(if: {Trade: {Side: {Type: {is: sell}}}})
//     sells: count(if: {Trade: {Side: {Type: {is: buy}}}})
//   }

export const SOLANA_NETWORK = "sol";
export const ETHEREUM_NETWORK = "eth";
export const BSC_NETWORK = "bsc";
export const TRANSACTION_OCCUR = "detail";

export const SOLANA_WSS_BASE_URL = "wss://streaming.bitquery.io/eap";
export const ETHEREUM_WSS_BASE_URL = "wss://streaming.bitquery.io/graphql";
export const BSC_WSS_BASE_URL = "wss://streaming.bitquery.io/graphql";

export const SOLANA_QUERY_BASE_URL = "https://streaming.bitquery.io/eap";
export const ETHEREUM_QUERY_BASE_URL = "https://streaming.bitquery.io/graphql";
export const BSC_QUERY_BASE_URL = "https://streaming.bitquery.io/graphql";

export enum BlockchainType {
  SOLANA = SOLANA_NETWORK,
  ETHEREUM = ETHEREUM_NETWORK,
  BSC = BSC_NETWORK,
}
