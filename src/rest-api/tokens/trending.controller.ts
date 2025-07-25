import { Controller, Get, Inject, Query } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { TokenSummaryService } from "@databases/token_analyze_summary/token-summary.service";
import Logger from "@common/logger";
import { BlockchainType } from "@common/constants";
import { DashboardTokenResponse } from "./types/dashboard-token-response.output";

@Controller("tokens")
export class TrendingController {
  constructor(private tokenSummaryService: TokenSummaryService) {}

  @Get("trending")
  async getTrending(@Query("network") network: string) {
    let trendingList: DashboardTokenResponse[] = [];

    try {
      trendingList = await this.tokenSummaryService.getTrendingList(
        network as BlockchainType | "all",
      );
    } catch (error) {
      Logger.getInstance().error(
        `Error while getting the trending list, error: ${error instanceof Error ? error.message : "Unknown Error"}`,
      );
    }

    return { data: trendingList };
  }
}
