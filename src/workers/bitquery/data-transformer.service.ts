import { Injectable } from "@nestjs/common";
import {
  BaseTokenInfo,
  BaseTokenTrade,
  BscTokenCreateRawType,
  BscTokenTradeRawType,
  SolanaDexTrade,
  SolanaTokenCreatedRawType,
  SolanaTokenTradeRawType,
  TradeMethod,
} from "./bitquery.types";
import { BSC_NETWORK, SOLANA_NETWORK } from "@common/constants";
import { getTimeStampFromIso8601 } from "@common/utils";
import Logger from "@common/logger";

/**
 * Service for transforming raw blockchain messages into structured data objects.
 * Handles Solana and Ethereum token/trade message conversions.
 */
@Injectable()
export class DataTransformerService {
  /**
   * Transforms a raw Solana token message into a structured TokenData object.
   *
   * @param raw - The raw Solana token message to transform.
   * @returns A TokenData object containing normalized token information.
   */
  transformSolanaTokenCreate(data: SolanaTokenCreatedRawType): BaseTokenInfo[] {
    try {
      if (!data || data.Solana.TokenSupplyUpdates.length < 1) return [];

      return data.Solana.TokenSupplyUpdates.map((token) => {
        return {
          symbol: token.TokenSupplyUpdate.Currency.Symbol,
          name: token.TokenSupplyUpdate.Currency.Name,
          address: token.TokenSupplyUpdate.Currency.MintAddress,
          network: SOLANA_NETWORK,
          degen_audit: "",
          uri: token.TokenSupplyUpdate.Currency.Uri,
          total_supply: Number(token.TokenSupplyUpdate.PostBalance),
          created_at: getTimeStampFromIso8601(token.Block.Time),
        };
      });
    } catch (e) {
      Logger.getInstance().error("transformSolanaTokenCreate Exception", e);
      return [];
    }
  }

  /**
   * Transforms a raw Solana trade message into a structured TradeData object.
   *
   * @param raw - The raw Solana trade message to transform.
   * @returns A TradeData object containing normalized trade information.
   */
  transformSolanaTokenTrade(data: SolanaTokenTradeRawType): BaseTokenTrade[] {
    if (
      data === null ||
      data.Solana === null ||
      data.Solana.DEXTrades === null ||
      data.Solana.DEXTrades.length === 0
    )
      return [];

    try {
      return data.Solana.DEXTrades.map(
        (item: SolanaDexTrade): BaseTokenTrade => {
          return {
            method: item.Instruction.Program.Method,
            time: item.Block.Time,
            buy: {
              amount: item.Trade.Buy.Amount,
              amountInUSD: item.Trade.Buy.AmountInUSD,
              account: item.Trade.Buy.Account.Owner,
              decimals: item.Trade.Buy.Currency.Decimals,
              address: item.Trade.Buy.Currency.MintAddress,
              name: item.Trade.Buy.Currency.Name,
              symbol: item.Trade.Buy.Currency.Symbol,
            },
            sell: {
              amount: item.Trade.Sell.Amount,
              amountInUSD: item.Trade.Sell.AmountInUSD,
              account: item.Trade.Sell.Account.Owner,
              decimals: item.Trade.Sell.Currency.Decimals,
              address: item.Trade.Sell.Currency.MintAddress,
              name: item.Trade.Sell.Currency.Name,
              symbol: item.Trade.Sell.Currency.Symbol,
            },
            txHash: item.Transaction.Signature,
          };
        },
      );
    } catch (err) {
      Logger.getInstance().error(err + ", " + JSON.stringify(data));
    }
    return [];
  }

  transformBscTokenCreate(data: BscTokenCreateRawType): BaseTokenInfo[] {
    if (
      data === null ||
      data.EVM === null ||
      data.EVM.Transfers === null ||
      data.EVM.Transfers.length < 1
    )
      return [];

    return data.EVM.Transfers.map((token) => ({
      symbol: token.Transfer.Currency.Symbol,
      name: token.Transfer.Currency.Name,
      address: token.Transfer.Currency.SmartContract,
      network: BSC_NETWORK,
      degen_audit: "",
      uri: "",
      total_supply: 0,
      created_at: getTimeStampFromIso8601(token.Block.Time),
    }));
  }
  transformBscTokenTrade(data: BscTokenTradeRawType): BaseTokenTrade[] {
    if (data === null || data.EVM === undefined || data.EVM === null) {
      return [];
    }
    if (data.EVM.DEXTrades.length < 1) return [];

    return data.EVM.DEXTrades.map((item) => {
      return {
        // If user sell bnb and get token, it's buy
        method:
          item.Trade.Sell.Currency.Symbol === "BNB"
            ? TradeMethod.buy
            : TradeMethod.sell, // [TODO] currently determined method by bnb token symbol, need confirmation
        time: item.Block.Time,
        buy: {
          amount: item.Trade.Buy.Amount,
          amountInUSD: item.Trade.Buy.AmountInUSD,
          account: item.Trade.Buy.Buyer,
          decimals: item.Trade.Buy.Currency.Decimals,
          address: item.Trade.Buy.Currency.SmartContract,
          name: item.Trade.Buy.Currency.Name,
          symbol: item.Trade.Buy.Currency.Symbol,
        },
        sell: {
          amount: item.Trade.Sell.Amount,
          amountInUSD: item.Trade.Sell.AmountInUSD,
          account: item.Trade.Sell.Seller,
          decimals: item.Trade.Sell.Currency.Decimals,
          address: item.Trade.Sell.Currency.SmartContract,
          name: item.Trade.Sell.Currency.Name,
          symbol: item.Trade.Sell.Currency.Symbol,
        },
        txHash: item.Transaction.Hash,
      };
    });
  }
  transformEthTokenTrade(data: BscTokenTradeRawType): BaseTokenTrade[] {
    if (data === null || data.EVM === undefined || data.EVM === null) {
      return [];
    }
    if (data.EVM.DEXTrades.length < 1) return [];

    return data.EVM.DEXTrades.map((item) => {
      return {
        // If user sell bnb and get token, it's buy
        method:
          item.Trade.Sell.Currency.Symbol === "WETH"
            ? TradeMethod.buy
            : TradeMethod.sell, // [TODO] currently determined method by bnb token symbol, need confirmation
        time: item.Block.Time,
        buy: {
          amount: item.Trade.Buy.Amount,
          amountInUSD: item.Trade.Buy.AmountInUSD,
          account: item.Trade.Buy.Buyer,
          decimals: item.Trade.Buy.Currency.Decimals,
          address: item.Trade.Buy.Currency.SmartContract,
          name: item.Trade.Buy.Currency.Name,
          symbol: item.Trade.Buy.Currency.Symbol,
        },
        sell: {
          amount: item.Trade.Sell.Amount,
          amountInUSD: item.Trade.Sell.AmountInUSD,
          account: item.Trade.Sell.Seller,
          decimals: item.Trade.Sell.Currency.Decimals,
          address: item.Trade.Sell.Currency.SmartContract,
          name: item.Trade.Sell.Currency.Name,
          symbol: item.Trade.Sell.Currency.Symbol,
        },
        txHash: item.Transaction.Hash,
      };
    });
  }
}
