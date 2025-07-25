import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { TradeHistoryService } from "@databases/trade-history/trade-history.service";
import { LiFiCrossChainService } from "@workers/trading/cross-chain/lifi-crosschain.service";
import { EthereumTradingService } from "@workers/trading/ethereum/ethereum-trading.service";
import { SolanaTradingService } from "@workers/trading/solana/solana-trading.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BinanceTradingService } from "@workers/trading/binance/binance-trading.service";
import { randomUUID } from "crypto";
import { LimitTriggerService } from "@workers/limit-trigger/limit-trigger.service";
import { TPSLSetting } from "@workers/limit-trigger/limit-trigger.types";
import Logger from "@common/logger";
import { TransactionsService } from "@databases/transactions/transactions.service";

export interface TradingParams {
  sourceChain: "ETH" | "SOL" | "BSC";
  sourceWalletAddress: string;
  sourcePrivateKey: string;
  sourceNativeAmount: string;

  targetChain: "ETH" | "SOL" | "BSC";
  targetWalletAddress: string;
  targetPrivateKey: string;
  memeTokenAddress: string;

  action: "buy" | "sell";
  memeTokenAmount?: string;
  slippage?: number;

  postSellCrossChain?: boolean;
  postSellTargetChain?: "ETH" | "SOL" | "BSC";
  postSellTargetWallet?: string;

  // TP/SL settings for market orders
  tpslSettings?: TPSLSetting[];
  userId?: string;
}

export interface TradeResult {
  success: boolean;
  step: "cross" | "swap" | "done";
  error?: string;
  transactionHash?: string;
  amountIn?: string;
  amountOut?: string;
}

@Injectable()
export class TradingService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly lifi: LiFiCrossChainService,
    private readonly eth: EthereumTradingService,
    private readonly sol: SolanaTradingService,
    private readonly bsc: BinanceTradingService,
    private readonly tradeHistory: TradeHistoryService,
    private readonly transService: TransactionsService,
  ) {}

  async tradeMemeCoin(params: TradingParams): Promise<TradeResult> {
    let step: "cross" | "swap" | "done" = "swap";
    let crossResult: any = null;
    let crossChainAmount: string = "0";

    let swapAmountIn: string = "0";
    let swapResult: any;
    let positionId: string = randomUUID();
    try {
      this.emitPositionStatus(
        positionId,
        params,
        "pending",
        step,
        params.sourceNativeAmount,
        "Position is opened",
      );

      // 1. Cross-chain transfer if needed
      if (params.sourceChain !== params.targetChain) {
        step = "cross";
        const crossResult = await this.lifi.executeSwap({
          sourceChain: params.sourceChain,
          sourceTokenAddress: undefined,
          sourceAmount: params.sourceNativeAmount,
          sourceWalletAddress: params.sourceWalletAddress,
          sourcePrivateKey: params.sourcePrivateKey,
          targetChain: params.targetChain,
          targetTokenAddress: undefined,
          targetWalletAddress: params.targetWalletAddress,
        });
        if (!crossResult.success) {
          throw new Error(
            crossResult.error || "Cross-chain exchange was failed",
          );
        }

        crossChainAmount = crossResult.amountOut || "0";

        // calculate available swap amount (reduce gas fee)
        swapAmountIn = this.calculateAvailableAmount(crossChainAmount);
      } else {
        swapAmountIn = params.sourceNativeAmount;
      }

      // 2. On-chain swap (buy/sell)
      if (params.targetChain === "ETH") {
        if (params.action === "buy") {
          swapResult = await this.eth.executeTrade({
            walletAddress: params.targetWalletAddress,
            privateKey: params.targetPrivateKey,
            action: "buy",
            tokenAddress: params.memeTokenAddress,
            amount: swapAmountIn,
            denominatedInEth: true,
            slippage: params.slippage || 1.0,
            deadline: 1200,
          });
        } else {
          swapResult = await this.eth.executeTrade({
            walletAddress: params.targetWalletAddress,
            privateKey: params.targetPrivateKey,
            action: "sell",
            tokenAddress: params.memeTokenAddress,
            amount: params.memeTokenAmount!,
            denominatedInEth: false,
            slippage: params.slippage || 1.0,
            deadline: 1200,
          });
        }
      } else if (params.targetChain === "SOL") {
        if (params.action === "buy") {
          swapResult = await this.sol.executeTrade({
            walletAddress: params.targetWalletAddress,
            privateKey: params.targetPrivateKey,
            action: "buy",
            tokenAddress: params.memeTokenAddress,
            amount: Number(swapAmountIn),
            slippage: params.slippage || 1.0,
            denominatedInSol: true,
            pool: "auto",
          });
        } else {
          swapResult = await this.sol.executeTrade({
            walletAddress: params.targetWalletAddress,
            privateKey: params.targetPrivateKey,
            action: "sell",
            tokenAddress: params.memeTokenAddress,
            amount: Number(params.memeTokenAmount ?? 0),
            denominatedInSol: false,
            slippage: params.slippage || 1.0,
            pool: "auto",
          });
        }
      } else if (params.targetChain === "BSC") {
        if (params.action === "buy") {
          swapResult = await this.bsc.executeTrade({
            walletAddress: params.targetWalletAddress,
            privateKey: params.targetPrivateKey,
            action: "buy",
            tokenAddress: params.memeTokenAddress,
            amount: swapAmountIn,
            slippage: params.slippage || 1.0,
            denominatedInBSC: true,
          });
        } else {
          swapResult = await this.bsc.executeTrade({
            walletAddress: params.targetWalletAddress,
            privateKey: params.targetPrivateKey,
            action: "sell",
            tokenAddress: params.memeTokenAddress,
            amount: params.memeTokenAmount ?? "0",
            denominatedInBSC: false,
            slippage: params.slippage || 1.0,
          });
        }
      }

      if (!swapResult?.success) {
        throw new Error(swapResult?.error || "Trading meme coin was failed");
      }

      // *** NEW: Register TP/SL settings if provided ***
      if (
        params.tpslSettings &&
        params.tpslSettings.length > 0 &&
        swapResult.transactionHash
      ) {
        this.registerTPSLSettings(params, swapResult);
      }

      // get the output amount from transaction table
      const transRecord = await this.transService.findByHash(
        swapResult.transactionHash,
      );
      if (params.action === "buy") {
        swapResult.amountOut = transRecord?.tokenAmount || "0";
      } else {
        swapResult.amountOut = transRecord?.nativeAmount || "0";
      }

      step = "done";

      await this.tradeHistory.saveTrade({
        sourceChain: params.sourceChain,
        sourceWalletAddress: params.sourceWalletAddress,
        sourceNativeAmount: params.sourceNativeAmount,
        crossChainTx: crossResult?.transactionHash,
        crossChainAmount,
        crossChainStatus: crossResult?.success,
        targetChain: params.targetChain,
        targetWalletAddress: params.targetWalletAddress,
        memeTokenAddress: params.memeTokenAddress,
        action: params.action,
        amountIn: swapResult.amountIn,
        amountOut: swapResult.amountOut,
        swapTx: swapResult?.transactionHash,
        swapStatus: swapResult?.success,
        steps: step,
        timestamp: Date.now(),
      });

      this.eventEmitter.emit("trade.occured", {
        ...params,
        step,
        positionId,
        crossChainTx: crossResult?.transactionHash,
        crossChainStatus: crossResult?.success,
        crossChainAmount,
        swapTx: swapResult?.transactionHash,
        swapStatus: swapResult?.success,
        amountIn: swapResult?.amountIn,
        amountOut: swapResult?.amountOut,
        timestamp: Date.now(),
        success: true,
      });

      return {
        success: true,
        step,
        transactionHash: swapResult?.transactionHash,
        amountIn: swapResult?.amountIn,
        amountOut: swapResult?.amountOut,
      };
    } catch (error: any) {
      await this.tradeHistory.saveTrade({
        ...params,
        steps: step,
        error: error.message || String(error),
        timestamp: Date.now(),
      });

      let errMsg = error.message;
      if (errMsg === "") {
        errMsg = "Trade operation was failed";
      }
      this.emitPositionStatus(
        positionId,
        params,
        "failed",
        step,
        params.sourceNativeAmount,
        errMsg,
      );

      return {
        success: false,
        step,
        error: error.message || String(error),
      };
    }
  }

  /**
   * Register TP/SL settings in LimitTriggerService after successful trade
   */
  private async registerTPSLSettings(
    params: TradingParams,
    swapResult: any,
  ): Promise<void> {
    try {
      const networkMap = {
        ETH: "eth",
        SOL: "sol",
        BSC: "bsc",
      };

      if (params.tpslSettings === undefined || params.tpslSettings === null) {
        return;
      }

      this.eventEmitter.emit("trade.tpsl.register", {
        userId: params.userId || params.targetWalletAddress,
        walletAddress: params.targetWalletAddress,
        tokenAddress: params.memeTokenAddress,
        network: networkMap[params.targetChain],
        orderType: params.action,
        expectedAmount: 0,
        expectedTxHash: swapResult.transactionHash,
        tpslSettings: params.tpslSettings,
      });

      Logger.getInstance().info(
        `TP/SL settings registered for transaction: ${swapResult.transactionHash}`,
      );
    } catch (error) {
      Logger.getInstance().error("Failed to register TP/SL settings:", error);
      // Don't throw error - trade was successful, TP/SL registration is secondary
    }
  }

  private emitPositionStatus(
    positionId: string,
    tradeParams: TradingParams,
    status: string,
    step: string,
    amountIn: string,
    msg: string,
  ) {
    this.eventEmitter.emit("trade.position_status", {
      ...tradeParams,
      positionId,
      status,
      step,
      action: tradeParams.action,
      amountIn,
      timestamp: Date.now(),
      msg,
    });
  }

  private calculateAvailableAmount(totalAmount: string): string {
    const total = BigInt(totalAmount);
    const gasReserve = (total * BigInt(5)) / BigInt(100); // 5% gas fee
    const available = total - gasReserve;
    return available.toString();
  }
}
