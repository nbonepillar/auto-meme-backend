import { Controller, Get, Query } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

@Controller("tokens")
export class SearchController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get("search")
  async searchTokens(@Query("keyword") keyword: string) {
    const keys = await this.redis.keys("datas:*:*");
    const searched_tokens = [];
    const q = keyword ? keyword.toLowerCase() : "";

    for (const key of keys) {
      const cached = await this.redis.get(key);
      if (!cached) continue;
      try {
        const item = JSON.parse(cached);

        const token = {
          uri: item.uri || "",
          name: item.name || "",
          address: item.address || "",
          "24h_vol": item.vol_24h || 0,
          liquidity: item.liquidity || 0,
          mc: item.mc || 0,
          network: item.network || "",
          _time: item.time || 0,
        };

        if (!keyword || keyword.length === 0) {
          searched_tokens.push(token);
        } else if (
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.address && item.address.toLowerCase().includes(q))
        ) {
          searched_tokens.push(token);
        }
      } catch {
        // skip invalid json
      }
    }

    searched_tokens.sort((a, b) => (b._time || 0) - (a._time || 0));
    const result = searched_tokens
      .slice(0, 20)
      .map(({ _time, ...rest }) => rest);

    return { searched_tokens: result };
  }
}
