import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import Redis from "ioredis";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { NetworkInputDto } from "./types/network.input";
import { TokenOutput } from "../token.output";
import { RedisTokenKeyType } from "../../redis/types/redis.types";
import { DashboardTokenResponse } from "./types/dashboard-token-response.output";
import Logger from "@common/logger";

/**
 * Controller for providing dashboard data for Solana tokens.
 * Fetches categorized token lists from Redis cache.
 */
@Controller("tokens")
export class DashboardController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Returns categorized token lists for dashboard view.
   *
   * @param network - Network filter (all, sol, eth, bsc). Currently ignored.
   * @returns An object with three arrays: tokens_new, tokens_com, tokens_mig, each containing TokenData objects.
   */
  @Get("dashboard")
  @ApiOkResponse({
    description: "Get dashboard tokens",
    type: DashboardTokenResponse,
  })
  async dashboardTokens(@Query() query: NetworkInputDto) {
    const networkPattern = query.network === "all" ? "*" : query.network;

    // Get necessary token address keys
    let keys: string[] = [];
    try {
      keys = (
        await Promise.all([
          this.redis.keys(
            `keys:${networkPattern}:${RedisTokenKeyType.new}:*-*`,
          ),
          this.redis.keys(
            `keys:${networkPattern}:${RedisTokenKeyType.completing}:*-*`,
          ),
          this.redis.keys(
            `keys:${networkPattern}:${RedisTokenKeyType.migrated}:*-*`,
          ),
        ])
      ).flat();
    } catch (error) {
      Logger.getInstance().error(
        `[REST dashboard.controller] Error fetching token addresses: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return [];
    }

    keys = keys.slice(0, 150);

    const pipeline = this.redis.pipeline();
    // Get token data
    keys.forEach((key) => {
      const network = key.split(":")[1];
      const address = key.split(":")[3].split("-")[0];
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
