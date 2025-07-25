import { Controller, Get, Post, Body, Delete, Query } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { getISO8601FromTimeStamp } from "src/common/utils";
import { DashboardTokenResponse } from "./types/dashboard-token-response.output";
import { TokenOutput } from "@rest-api/token.output";
import Logger from "@common/logger";

@Controller("tokens")
export class WatchlistController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * POST /tokens/watchlist
   * body: { user_id: string, token_address: string, network: string }
   * Adds a token to the user's watchlist in Redis.
   */
  @Post("watchlist")
  async addToWatchList(
    @Body("user_id") user_id: string,
    @Body("token_address") token_address: string,
    @Body("network") network: string,
  ) {
    if (!user_id || !token_address || !network) {
      return { success: false, message: "Missing required parameters" };
    }
    const key = `watchlist:${user_id}`;
    const value = `${network.toLowerCase()}:${token_address}`;
    await this.redis.sadd(key, value);
    return { success: true, message: "Token added to watchlist" };
  }

  @Delete("watchlist")
  async removeFromWatchList(
    @Body("user_id") user_id: string,
    @Body("token_address") token_address: string,
    @Body("network") network: string,
  ) {
    if (!user_id || !token_address || !network) {
      return { success: false, message: "Missing required parameters" };
    }
    const key = `watchlist:${user_id}`;
    const value = `${network.toLowerCase()}:${token_address}`;
    const removed = await this.redis.srem(key, value);
    if (removed > 0) {
      return { success: true, message: "Token removed from watchlist" };
    } else {
      return { success: false, message: "Token not found in watchlist" };
    }
  }

  @Get("watchlist")
  async getWatchList(
    @Query("user_id") user_id: string,
    @Query("network") network: string,
    @Query("category") category: string,
  ) {
    if (!user_id || !category || !network) {
      return { success: false, message: "Missing required parameters" };
    }
    const key = `watchlist:${user_id}`;
    const members = await this.redis.smembers(key);
    // filter by network

    let addresses: string[] = [];

    if (network.toLowerCase() === "all") {
      // Get all addresses regardless of network
      addresses = members.map((entry) => entry.split(":").slice(1).join(":"));
    } else {
      // Filter by network
      addresses = members
        .filter((entry) => entry.startsWith(`${network.toLowerCase()}:`))
        .map((entry) => entry.split(":").slice(1).join(":"));
    }

    const pipeline = this.redis.pipeline();
    // Get token data
    addresses.forEach((address) => {
      pipeline.get(`datas:${network}:${address}`);
    });
    const tokens = await pipeline.exec();

    // Convert token data
    let outputs: DashboardTokenResponse[] = [];

    if (tokens) {
      for (const [err, data] of tokens) {
        if (!err && data) {
          try {
            const tokenOutput = JSON.parse(data as string) as TokenOutput;
            outputs.push({
              network: tokenOutput.network,
              symbol: tokenOutput.symbol,
              name: tokenOutput.name,
              address: tokenOutput.address,
              uri: tokenOutput.uri,
              price: tokenOutput.price,
              mc: tokenOutput.mc,
              status: tokenOutput.status as 0 | 1 | 2,
              total_supply: tokenOutput.cnt_holder,
              top10holders: tokenOutput.top10holders,
              degen_audit: tokenOutput.degen_audit,
              time: tokenOutput.time,
              vol_1m: tokenOutput.vol_1m,
              vol_5m: tokenOutput.vol_5m,
              vol_15m: tokenOutput.vol_15m,
              vol_30m: tokenOutput.vol_30m,
              vol_1h: tokenOutput.vol_1h,
              vol_6h: tokenOutput.vol_6h,
              vol_12h: tokenOutput.vol_12h,
              vol_24h: tokenOutput.vol_24h,
              txs_1h: tokenOutput.sell_cnt_24h + tokenOutput.buy_cnt_24h, // txs_1h param showed as 24h trans count in frontend
              price_change_24h: tokenOutput.price_change_24h,
              cnt_holder: tokenOutput.cnt_holder,
            });
          } catch (error) {
            Logger.getInstance().error(
              `[REST dashboard.controller] Error parsing token data for address: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            continue;
          }
        }
      }
    }

    return { data: outputs };
  }
}
