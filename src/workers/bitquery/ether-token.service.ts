import { Injectable } from "@nestjs/common";
import { WorkerService } from "../worker.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataTransformerService } from "./data-transformer.service";
import { BitQueryService } from "./bitquery.service";
import { NetworkTokenServiceInterface } from "../interface/token-service-interface";
import {
  ETHEREUM_NETWORK,
  ETHEREUM_TOKEN_CREATE_SUBSCRIPTION,
  ETHEREUM_TOKEN_TRADE_SUBSCRIPTION,
  ETHEREUM_WSS_BASE_URL,
} from "../../common/constants";

/**
 * Service for managing Ethereum token data streams, transformation, caching, and persistence.
 */
@Injectable()
export class EtherTokenService
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
   * Initializes the service by subscribing to BitQueryService for real-time token updates and starting the Redis stream consumer.
   */
  onModuleInit() {
    super.onModuleInit();

    super.setNetwork(ETHEREUM_NETWORK);

    this.getTokenCreates();
    this.getTokenTrades();
    this.initializeCompletingTokens();
  }

  async getTokenCreates() {
    await super.getNewlyCreatedTokens(
      ETHEREUM_TOKEN_CREATE_SUBSCRIPTION,
      ETHEREUM_WSS_BASE_URL,
    );
  }

  getTokenTrades() {
    super.getNewlyCreatedTrades(
      ETHEREUM_TOKEN_TRADE_SUBSCRIPTION,
      ETHEREUM_WSS_BASE_URL,
    );
  }

  initializeCompletingTokens() {
    super.initializeTokens();
  }
}
