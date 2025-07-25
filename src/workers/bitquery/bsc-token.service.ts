import { Injectable } from "@nestjs/common";
import { WorkerService } from "../worker.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataTransformerService } from "./data-transformer.service";
import { NetworkTokenServiceInterface } from "../interface/token-service-interface";
import { BitQueryService } from "./bitquery.service";
import {
  BSC_TOKEN_CREATE_SUBSCRIPTION,
  BSC_TOKEN_TRADE_SUBSCRIPTION,
  BSC_WSS_BASE_URL,
  BSC_NETWORK,
} from "../../common/constants";

@Injectable()
export class BscTokenService
  extends WorkerService
  implements NetworkTokenServiceInterface
{
  constructor(
    bitqueryService: BitQueryService,
    dataTransformer: DataTransformerService,
    eventEmitter: EventEmitter2,
  ) {
    super(bitqueryService, dataTransformer, eventEmitter);
  }

  onModuleInit(): void {
    super.onModuleInit();

    super.setNetwork(BSC_NETWORK);

    this.getTokenCreates();
    this.getTokenTrades();
    this.initializeCompletingTokens();
  }

  async getTokenCreates() {
    await super.getNewlyCreatedTokens(
      BSC_TOKEN_CREATE_SUBSCRIPTION,
      BSC_WSS_BASE_URL,
    );
  }

  getTokenTrades() {
    super.getNewlyCreatedTrades(BSC_TOKEN_TRADE_SUBSCRIPTION, BSC_WSS_BASE_URL);
  }

  initializeCompletingTokens() {
    super.initializeTokens();
  }
}
