import { Injectable } from "@nestjs/common";
import { WorkerService } from "../worker.service";
import { BitQueryService } from "./bitquery.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataTransformerService } from "./data-transformer.service";
import {
  SOLANA_NETWORK,
  SOLANA_TOKEN_CREATE_SUBSCRIPTION,
  SOLANA_TOKEN_TRADE_SUBSCRIPTION,
  SOLANA_WSS_BASE_URL,
} from "../../common/constants";
import { NetworkTokenServiceInterface } from "../interface/token-service-interface";

/**
 * Service for managing Solana token data streams, transformation, caching, and persistence.
 */
@Injectable()
export class SolTokenService
  extends WorkerService
  implements NetworkTokenServiceInterface
{
  constructor(
    bitQueryService: BitQueryService,
    dataTransformer: DataTransformerService,
    eventEmitter: EventEmitter2,
  ) {
    super(bitQueryService, dataTransformer, eventEmitter);
  }

  /**
   * Initializes the service by subscribing to BitqueryService for real-time token updates and starting the Redis stream consumer.
   */
  onModuleInit() {
    super.onModuleInit();

    super.setNetwork(SOLANA_NETWORK);

    this.getTokenCreates();
    this.getTokenTrades();
    this.initializeCompletingTokens();
  }

  async getTokenCreates() {
    await super.getNewlyCreatedTokens(
      SOLANA_TOKEN_CREATE_SUBSCRIPTION,
      SOLANA_WSS_BASE_URL,
    );
  }

  getTokenTrades() {
    super.getNewlyCreatedTrades(
      SOLANA_TOKEN_TRADE_SUBSCRIPTION,
      SOLANA_WSS_BASE_URL,
    );
  }

  initializeCompletingTokens() {
    super.initializeTokens();
  }
}
