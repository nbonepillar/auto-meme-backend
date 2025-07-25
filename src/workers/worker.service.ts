import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  createPublicClient,
  http,
  PublicClient,
  encodeFunctionData,
  decodeFunctionResult,
} from "viem";
import { mainnet } from "viem/chains";
import { DataTransformerService } from "@workers/bitquery/data-transformer.service";
import { BitQueryService } from "@workers/bitquery/bitquery.service";
import { EventEmitter } from "events";
import {
  BaseTokenTrade,
  BscTokenCreateRawType,
  BscTokenTradeRawType,
  SolanaTokenCreatedRawType,
  SolanaTokenTradeRawType,
  EthereumTokenCreatedRawType,
  BaseTokenInfo,
} from "@workers/bitquery/bitquery.types";
import {
  BSC_NETWORK,
  ETHEREUM_NETWORK,
  SOLANA_NETWORK,
} from "@common/constants";
import { MULTICALL3_ABI, MULTICALL3_ADDRESS, TOKEN_ABI } from "@common/abi";
import { getTimeStampFromIso8601 } from "@common/utils";
import Logger from "@common/logger";

/**
 * Service for managing Solana token data streams, transformation, caching, and persistence.
 */
@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger: Logger | null = null;

  private tokenUpdatesEmitter: EventEmitter | null = null;
  private tokenTradesEmitter: EventEmitter | null = null;
  private network: string = "";

  private publicClient: PublicClient | null = null;

  constructor(
    private readonly bitQueryService: BitQueryService,
    private readonly dataTransformer: DataTransformerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
  }

  /**
   * Initializes the service by subscribing to BitqueryService for real-time token updates and starting the Redis stream consumer.
   */
  onModuleInit() {}

  protected setNetwork(network: string) {
    this.network = network;
  }

  /**
   * Initialize completing | completed coins
   */
  protected initializeTokens() {
    process.nextTick(() => {
      this.eventEmitter.emit("token.candidate_list", this.network);
    });
  }

  /**
   * Get un-completed coin's trading data
   * @returns
   */
  protected getNewlyCreatedTrades<T>(query: string, baseUrl: string) {
    this.tokenTradesEmitter = this.bitQueryService.getWebSocketEmitter(
      query,
      baseUrl,
    );

    const handleData = async (data: T) => {
      let tradeData: BaseTokenTrade[] = [];

      if (this.network === SOLANA_NETWORK) {
        tradeData = this.dataTransformer.transformSolanaTokenTrade(
          data as SolanaTokenTradeRawType,
        );
      } else if (this.network === ETHEREUM_NETWORK) {
        tradeData = this.dataTransformer.transformEthTokenTrade(
          data as BscTokenTradeRawType,
        );
      } else if (this.network === BSC_NETWORK) {
        tradeData = this.dataTransformer.transformBscTokenTrade(
          data as BscTokenTradeRawType,
        );
      }

      if (tradeData.length < 1) return;

      this.eventEmitter.emit("token.traded", tradeData, this.network);
    };

    const handleError = (err: Error) => {
      Logger.getInstance().error("Error in token trades subscription:", err);
      this.tokenTradesEmitter?.removeAllListeners();
      this.tokenTradesEmitter = null;

      setTimeout(() => {
        this.getNewlyCreatedTrades<T>(query, baseUrl);
      }, 5000);
    };

    const handleClose = () => {
      Logger.getInstance().info("Token trades subscription closed");
      this.tokenTradesEmitter?.removeAllListeners();
      this.tokenTradesEmitter = null;

      setTimeout(() => {
        this.getNewlyCreatedTrades<T>(query, baseUrl);
      }, 5000);
    };

    this.tokenTradesEmitter.on("data", handleData);
    this.tokenTradesEmitter.on("error", handleError);
    this.tokenTradesEmitter.on("close", handleClose);

    return () => {
      this.tokenTradesEmitter?.removeAllListeners();
      // this.tokenTradesEmitter?.removeListener("data", handleData);
      // this.tokenTradesEmitter?.removeListener("error", handleError);
      // this.tokenTradesEmitter?.removeListener("close", handleClose);
    };
  }

  // TODO: If possible, try to get the symbol info from the BitQuery API directly
  /**
   * Get Token Symbol, Name, Uri for ERC20 tokens
   *
   * @param data
   * @returns
   */
  private async getAdditionalInfo(data: EthereumTokenCreatedRawType) {
    if (data === null || data.EVM === null) return;

    const { Events } = data.EVM;
    const tokens: string[] = [];
    let blockTime: string = "";
    for (const poolEvent of Events) {
      const { Arguments } = poolEvent;

      for (const argument of Arguments) {
        const { Type, Value } = argument;
        if (
          Type !== "address" ||
          !Value?.address ||
          Value?.address === "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
        ) {
          continue;
        }

        tokens.push(Value.address);
        blockTime = poolEvent.Block.Time;
      }
    }

    if (tokens.length === 0 || !this.publicClient) return [];

    // Prepare multicall data for each token
    const calls = tokens.flatMap((address) => {
      return [
        {
          target: address as `0x${string}`,
          allowFailure: true,
          callData: encodeFunctionData({
            abi: TOKEN_ABI,
            functionName: "name",
          }),
        },
        {
          target: address as `0x${string}`,
          allowFailure: true,
          callData: encodeFunctionData({
            abi: TOKEN_ABI,
            functionName: "symbol",
          }),
        },
        {
          target: address as `0x${string}`,
          allowFailure: true,
          callData: encodeFunctionData({
            abi: TOKEN_ABI,
            functionName: "totalSupply",
          }),
        },
      ];
    });

    // Execute multicall
    const results = await this.publicClient.simulateContract({
      address: MULTICALL3_ADDRESS as `0x${string}`,
      abi: MULTICALL3_ABI,
      functionName: "aggregate3",
      args: [calls],
    });

    // Process results
    return tokens.map((address, index) => {
      const baseIndex = index * 3; // Each token has 4 calls

      const [nameResult, symbolResult, totalSupplyResult] = (
        results.result as Array<{ success: boolean; returnData: string }>
      ).slice(baseIndex, baseIndex + 3);

      let name = "",
        symbol = "",
        totalSupply = BigInt(0);

      if (nameResult.success) {
        name = decodeFunctionResult({
          abi: TOKEN_ABI,
          functionName: "name",
          data: nameResult.returnData as `0x${string}`,
        });
      }

      if (symbolResult.success) {
        symbol = decodeFunctionResult({
          abi: TOKEN_ABI,
          functionName: "symbol",
          data: symbolResult.returnData as `0x${string}`,
        });
      }

      if (totalSupplyResult.success) {
        totalSupply = decodeFunctionResult({
          abi: TOKEN_ABI,
          functionName: "totalSupply",
          data: totalSupplyResult.returnData as `0x${string}`,
        });
      }

      let output: BaseTokenInfo = {
        address,
        name,
        symbol,
        network: ETHEREUM_NETWORK,
        degen_audit: "",
        uri: "",
        total_supply: Number(totalSupply),
        created_at: getTimeStampFromIso8601(blockTime),
      };

      return output;
    });
  }

  /**
   * Get newly created pumpfun coins
   * @returns
   */
  protected async getNewlyCreatedTokens<T>(query: string, baseUrl: string) {
    this.tokenUpdatesEmitter = this.bitQueryService.getWebSocketEmitter(
      query,
      baseUrl,
    );

    const handleData = async (data: T) => {
      try {
        // Transform token data
        let tokenData: BaseTokenInfo[] = [];

        if (this.network === SOLANA_NETWORK) {
          tokenData = this.dataTransformer.transformSolanaTokenCreate(
            data as SolanaTokenCreatedRawType,
          );
        } else if (this.network === ETHEREUM_NETWORK) {
          tokenData =
            (await this.getAdditionalInfo(
              data as EthereumTokenCreatedRawType,
            )) ?? [];
        } else if (this.network === BSC_NETWORK) {
          tokenData = this.dataTransformer.transformBscTokenCreate(
            data as BscTokenCreateRawType,
          );
        }

        if (tokenData.length < 1) return;

        // Emit token created event
        Logger.getInstance().info(
          "[WorkerService] Received token create event from websocket",
        );
        for (const token of tokenData) {
          Logger.getInstance().info(
            `[WorkerService] TokenDetails ${token.address}, ${token.symbol}`,
          );
        }
        this.eventEmitter.emit("token.created", tokenData, this.network);
      } catch (err) {
        Logger.getInstance().error(
          "Cannot decode zero data ('0x') with ABI parameters.",
          err,
        );
      }
    };

    const handleError = (err: Error) => {
      Logger.getInstance().error("Error in token updates subscription:", err);
      this.tokenUpdatesEmitter?.removeAllListeners();
      this.tokenUpdatesEmitter = null;

      setTimeout(() => {
        this.getNewlyCreatedTokens<T>(query, baseUrl);
      }, 5000);
    };

    const handleClose = () => {
      Logger.getInstance().info("Token updates subscription closed");
      this.tokenUpdatesEmitter?.removeAllListeners();
      this.tokenUpdatesEmitter = null;

      setTimeout(() => {
        this.getNewlyCreatedTokens<T>(query, baseUrl);
      }, 5000);
    };

    this.tokenUpdatesEmitter.on("data", handleData);
    this.tokenUpdatesEmitter.on("error", handleError);
    this.tokenUpdatesEmitter.on("close", handleClose);

    // Return cleanup function
    return () => {
      this.tokenUpdatesEmitter?.removeAllListeners();
      // this.tokenUpdatesEmitter?.removeListener("data", handleData);
      // this.tokenUpdatesEmitter?.removeListener("error", handleError);
      // this.tokenUpdatesEmitter?.removeListener("close", handleClose);
    };
  }
}
