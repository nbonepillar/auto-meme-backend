import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  BSC_NETWORK,
  SOLANA_NETWORK,
  TRANSACTION_OCCUR,
} from "../common/constants";

@Injectable()
export class CompletedListService {
  private readonly logger = new Logger(CompletedListService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCronSOL() {
    try {
      this.logger.debug("Fetching completed token list from Solana...");
      this.eventEmitter.emit("token.candidate_list", SOLANA_NETWORK);
      this.logger.debug(
        "Completed token list updated successfully from Solana",
      );
    } catch (error) {
      this.logger.error(
        `Error updating completed token list (SOL): ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCronBSC() {
    try {
      this.logger.debug("Fetching completed token list from BSC...");
      this.eventEmitter.emit("token.candidate_list", BSC_NETWORK);
      this.logger.debug("Completed token list updated successfully from BSC");
    } catch (error) {
      this.logger.error(
        `Error updating completed token list (BSC): ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleAnalyzeSummary() {
    try {
      this.eventEmitter.emit("token.transaction_analysis");
    } catch (error) {
      this.logger.error(
        `Error updating completed token list (TRANSACTION): ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRefreshTrendingList() {
    try {
      this.eventEmitter.emit("trending.refresh");
    } catch (error) {
      this.logger.error(
        `Failed to emit trending.refresh event, error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
