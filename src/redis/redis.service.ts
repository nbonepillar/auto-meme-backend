import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";
import { OnEvent } from "@nestjs/event-emitter";
import { TokenOutput } from "../rest-api/token.output";
import {
  TradeMethod,
  BaseTokenTrade,
  BaseTokenInfo,
} from "../workers/bitquery/bitquery.types";
import {
  getStatusFromTokenKeyType,
  RedisTokenKeyType,
  TokenTradeCoreType,
} from "./types/redis.types";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Transaction } from "../databases/transactions/transactions.entity";
import { Interval } from "@nestjs/schedule";
import Logger from "../common/logger";
import { TokenSummaryResponse } from "@databases/token_analyze_summary/types/token-summary-response.type";
import { TokenSummaryService } from "@databases/token_analyze_summary/token-summary.service";
import { BlockchainType } from "@common/constants";
import { logger } from "ethers";

// TODO: need to unusable cached token datas every for 1 min
// TODO: divide cache data type and broadcast types
@Injectable()
export class ManRedisService {
  private readonly maxCacheLength = 50;

  // @Interval(600000)
  // private async cleanUnusedDatasCache() {
  //   const datasKeys = await this.redis.keys("datas:*");
  //   if (datasKeys.length === 0) return;

  //   const pipeline = this.redis.pipeline();
  //   const toDelete: string[] = [];

  //   for (const key of datasKeys) {
  //     // datas:{network}:{address}
  //     const parts = key.split(":");
  //     if (parts.length < 3) continue;
  //     const network = parts[1];
  //     const address = parts.slice(2).join(":");
  //     // keys:{network}:*:{address}-*
  //     const keysPattern = `keys:${network}:*:${address}-*`;
  //     const foundKeys = await this.redis.keys(keysPattern);
  //     if (foundKeys.length === 0) {
  //       toDelete.push(key);
  //     }
  //   }

  //   if (toDelete.length > 0) {
  //     await this.redis.del(...toDelete);
  //     Logger.getInstance().info(
  //       `Cleaned up ${toDelete.length} unused datas: keys`,
  //     );
  //   }
  // }

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private tokenSummaryService: TokenSummaryService,
  ) {}

  @OnEvent("token.created")
  handleTokenCreated(data: BaseTokenInfo[], network: string) {
    this.processTokenCreated(data, network);
  }

  @OnEvent("token.traded")
  handleTokenTraded(data: BaseTokenTrade[], network: string) {
    this.processTokenTraded(data, network);
  }

  @OnEvent("token.completed_list")
  handleTokenCompletedList(
    data: [TokenOutput[], TokenOutput[]],
    network: string,
  ) {
    this.processTokenCompletedList(data[0], data[1], network);
  }

  @OnEvent("token.transaction_analysis")
  handleTransactionAnalysis() {
    this.analysisTransaction();
  }

  @OnEvent("trending.refresh")
  handleRefreshTrendingList() {
    this.refreshTrendingList();
  }

  private async analysisTransaction() {
    const allKeys = await this.redis.keys("datas:*");

    let addresses: {
      [BlockchainType.SOLANA]: string[];
      [BlockchainType.ETHEREUM]: string[];
      [BlockchainType.BSC]: string[];
    } = {
      [BlockchainType.SOLANA]: [],
      [BlockchainType.ETHEREUM]: [],
      [BlockchainType.BSC]: [],
    };

    allKeys.forEach((key, index) => {
      const parts = key.split(":");
      if (parts.length >= 3) {
        const network: BlockchainType = parts[1] as BlockchainType;
        const address = parts[2];
        if (!addresses[network].includes(address)) {
          addresses[network].push(address);
        }
      }
    });

    const types = [
      BlockchainType.SOLANA,
      BlockchainType.ETHEREUM,
      BlockchainType.BSC,
    ];

    // Update redis cache
    const writePipeline = this.redis.pipeline();

    for (let i = 0; i < types.length; i++) {
      const blockchainType = types[i];
      const addressList = addresses[blockchainType];
      if (addressList.length === 0) continue;

      const analysisData: TokenSummaryResponse[] =
        await this.tokenSummaryService.getTokensSummary(
          blockchainType,
          addressList,
        );

      const holderMap = await this.tokenSummaryService.getTokenHoldersCount(
        addressList,
        blockchainType,
      );

      for (let j = 0; j < analysisData.length; j++) {
        const summary = analysisData[j];
        const key = `datas:${blockchainType}:${summary.token}`;

        let token;

        try {
          const jsonStr = await this.redis.get(key);
          if (jsonStr) token = JSON.parse(jsonStr);
          else continue;
        } catch {
          continue;
        }

        let cnt_holder = 0;
        if (holderMap) cnt_holder = holderMap.get(summary.token) || 0;
        // Update token data with analysis data
        token = TokenOutput.assignSummary(token, summary, cnt_holder);

        writePipeline.set(key, JSON.stringify(token));
      }
    }

    await writePipeline.exec();

    logger.info(`Update summary of ${allKeys.length} tokens in redis`);
  }

  /**
   * Make a redis key for a token
   * @param address - The address of the token
   * @param type - The type of the token
   * @returns The redis key
   */
  private makeRedisKey(
    network: string,
    type: RedisTokenKeyType,
    address: string,
  ) {
    const timestamp = Date.now();

    return `keys:${network}:${type}:${address}-${timestamp}`;
  }

  private async isMonitorKey(
    network: string,
    tokenAddress: string,
  ): Promise<boolean> {
    const pattern = `keys:${network}:*:${tokenAddress}-*`;

    let cursor = "0";
    const result = await this.redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = result[0];
    if (cursor !== "0") return true;

    return false;
  }

  private async getMonitorKeys(
    network: string,
    tokenAddress: string,
  ): Promise<string[]> {
    const pattern = `keys:${network}:*:${tokenAddress}-*`;
    const keys: string[] = [];

    let cursor = "0";
    do {
      const result = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== "0");

    return keys;
  }

  private async manageCacheSize(
    network: string,
    keyType: RedisTokenKeyType,
    limitSize: number,
  ) {
    const keys = await this.redis.keys(`keys:${network}:${keyType}:*`);
    if (keys.length > limitSize) {
      // Calculate how many to remove
      const excessCount = keys.length - limitSize;

      // Sort keys and get the oldest ones to remove
      const keysToRemove = keys
        .map((key) => {
          const timestampIndex = key.lastIndexOf("-");
          return {
            key,
            timestamp: Number(key.slice(timestampIndex + 1)),
          };
        })
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
        .slice(0, excessCount)
        .map((item) => item.key);

      if (keysToRemove.length === 0) return;

      await this.redis.del(...keysToRemove);
    }
  }

  private async addMonitorKey(
    network: string,
    type: RedisTokenKeyType,
    tokenAddr: string,
  ) {
    // check if the token is already in special kind list, if not exist add keys
    const existKeys = await this.redis.keys(
      `keys:${network}:${type}:${tokenAddr}-*`,
    );
    if (existKeys.length > 0) {
      return;
    }

    const redisKey = this.makeRedisKey(network, type, tokenAddr);
    try {
      await this.redis.set(redisKey, "");
    } catch (e) {
      console.log("Error adding monitor key: ", e);
    }
  }

  private async processTokenCreated(datas: BaseTokenInfo[], network: string) {
    if (!datas || datas.length === 0) return;

    const pipeline = this.redis.pipeline();

    // check if the token is already in newly list, if not exist add keys
    let dashboardCastData: TokenOutput[] = [];
    for (const token of datas) {
      if (token.symbol === "") continue;

      await this.addMonitorKey(network, RedisTokenKeyType.new, token.address);

      const tokenData: TokenOutput = TokenOutput.create({
        network: token.network,
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        uri: token.uri,
        price: 0, // Initial price is set to 0
        mc: 0, // Initial market cap is set to 0
        status: getStatusFromTokenKeyType(RedisTokenKeyType.new),
        total_supply: token.total_supply || 1e9, // Default total supply is set to 1e9
        top10holders: 0, // Initial top holders count is set to 0
        degen_audit: token.degen_audit || "",
        time: token.created_at + "" || Date.now() + "",
      });

      pipeline.set(
        `datas:${network}:${token.address}`,
        JSON.stringify(tokenData),
      );

      dashboardCastData.push(tokenData);
    }

    if (dashboardCastData.length > 0) {
      Logger.getInstance().info(
        "[RedisService] New event emit: token.dashboard_broadcast_new, new token count: " +
          dashboardCastData.length,
      );
      this.eventEmitter.emit(
        "token.dashboard_broadcast_new",
        dashboardCastData,
      );
    }

    await pipeline.exec();

    // manage key cache size
    await this.manageCacheSize(
      network,
      RedisTokenKeyType.new,
      this.maxCacheLength,
    );
  }

  /**
   * Update token information with real-time data
   */
  private async processTokenTraded(
    origTrades: BaseTokenTrade[],
    network: string,
  ) {
    let updatedTokens: TokenOutput[] = [];

    const pipeline = this.redis.pipeline();

    const trades: TokenTradeCoreType[] = origTrades.map((trade) => {
      const isBuy = trade.method === TradeMethod.buy;
      const tradeAmountInUSD = parseFloat(
        trade[isBuy ? "sell" : "buy"]?.amountInUSD,
      );
      const tokenAmount = parseFloat(trade[isBuy ? "buy" : "sell"]?.amount);
      const priceInUSD = tradeAmountInUSD / tokenAmount;

      return {
        tx: trade.txHash,
        is_buy: isBuy,
        token: trade[isBuy ? "buy" : "sell"]?.address,
        total_usd: tradeAmountInUSD,
        amount: tokenAmount,
        price: priceInUSD,
        wallet: trade[isBuy ? "sell" : "buy"]?.account,
        time: trade.time,
      };
    });

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];

      // check if the data is need to monitoring
      const monitorKeys = await this.getMonitorKeys(network, trade.token);
      if (monitorKeys.length === 0) {
        continue;
      }

      // get cached data
      const dataKey = `datas:${network}:${trade.token}`;
      const cachedJson = await this.redis.get(dataKey);

      if (cachedJson == null) continue;

      let cachedData: TokenOutput = JSON.parse(cachedJson);

      cachedData.price = trade.price;
      cachedData.mc = cachedData.price * 1e9;

      cachedData = TokenOutput.updateSummaryOnTransaction(
        cachedData,
        trade.is_buy,
        trade.total_usd,
      );

      // save the updated data to cache
      pipeline.set(dataKey, JSON.stringify(cachedData));

      updatedTokens.push(cachedData);
    }

    // Logger.getInstance().info(
    //   `Token trade, NETWORK: ${network}, trade count: ${trades.length}`
    // );

    if (updatedTokens.length > 0) {
      this.eventEmitter.emit("token.updated_broadcast", updatedTokens, trades);
    }

    await pipeline.exec();
  }

  private async processTokenCompletedList(
    completingTokens: TokenOutput[],
    migratingTokens: TokenOutput[],
    network: string,
  ) {
    await this.processTokenCompletedListUpdated(
      network,
      RedisTokenKeyType.completing,
      completingTokens,
    );
    await this.processTokenCompletedListUpdated(
      network,
      RedisTokenKeyType.migrated,
      migratingTokens,
    );
  }

  /**
   * Upsert completed/completing tokens into Redis as individual keys (not as a list),
   * using the same key logic as ManRedisService.
   * If the number of keys for the type exceeds 50, remove the oldest.
   * If a token with the same address exists, update the latest one.
   * @param keyPattern Redis key pattern (e.g., 'sol:com*' or 'sol:mig*')
   * @param tokens Array of TokenOutput
   */
  private async processTokenCompletedListUpdated(
    network: string,
    type: RedisTokenKeyType,
    tokens: TokenOutput[],
  ) {
    // Determine type prefix (e.g., 'sol:com' or 'sol:mig')
    // Get all existing keys for this type
    const keyPattern = ``;
    let allKeys = await this.redis.keys(`${keyPattern}*`);

    for (const token of tokens) {
      // Key Cache Management
      const existKeys = await this.redis.keys(
        `keys:${network}:${type}:${token.address}-*`,
      );
      if (existKeys.length > 0) {
        // If the key is already exist, remove old one and add new one
        for (const key of existKeys) {
          await this.redis.del(...existKeys);
        }
      }
      existKeys.length = 0;

      // Create a new key
      const newKey = this.makeRedisKey(network, type, token.address);
      try {
        await this.redis.set(newKey, "");
      } catch (e) {
        console.error("Error adding monitor key: ", e);
      }
      allKeys.push(newKey);

      // Set the data
      const dataKey = `datas:${network}:${token.address}`;
      try {
        await this.redis.set(dataKey, JSON.stringify(token));
      } catch (e) {
        console.error("Error setting token data: ", e);
      }
    }

    // Cache size management for key cache
    await this.manageCacheSize(network, type, this.maxCacheLength);

    // emit event to cast data
    this.eventEmitter.emit("token.mig_com_list_updated", tokens);
  }

  private async refreshTrendingList() {
    try {
      const trendingList = await this.tokenSummaryService.getTrendingList();

      this.eventEmitter.emit("trending.list_updated", trendingList);
    } catch (error) {
      Logger.getInstance().error(
        `Error while getting the trending list, error: ${error instanceof Error ? error.message : "Unknown Error"}`,
      );
    }
  }
}
