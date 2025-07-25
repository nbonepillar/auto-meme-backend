import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import axios from "axios";
import {
  createConfig,
  ChainId,
  getQuote,
  getRoutes,
  executeRoute,
  EVM,
  Solana,
  KeypairWalletAdapter,
} from "@lifi/sdk";
import type { Chain } from "viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, bsc, mainnet, optimism, polygon, scroll } from "viem/chains";
import { normalizeHexPrefix } from "../../../common/utils";

export interface CrossChainSwapParams {
  // Source chain info
  sourceChain: "ETH" | "SOL" | "BSC";
  sourceTokenAddress?: string; // undefined for native tokens
  sourceAmount: string;
  sourceWalletAddress: string;
  sourcePrivateKey: string;

  // Target chain info
  targetChain: "ETH" | "SOL" | "BSC";
  targetTokenAddress?: string; // undefined for native tokens
  targetWalletAddress: string;

  // Options
  slippage?: number; // default 3%
  allowBridges?: string[]; // specific bridges to use
  maxGasPrice?: string;
}

export interface CrossChainSwapResult {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  estimatedTime?: string;
  bridgeUsed?: string;
  fees?: {
    gas: string;
    bridge: string;
    total: string;
  };
  amountOut?: string;
  quote?: any;
  // Enhanced status tracking
  executionSteps?: Array<{
    stepIndex: number;
    txHash: string;
    status: string;
    chainId: number;
    type: string;
    timestamp: number;
  }>;
  finalStatus?: "DONE" | "FAILED" | "PENDING" | "NOT_STARTED";
  totalExecutionTime?: number;
  routeId?: string;
}

export interface CrossChainQuote {
  fromAmount: string;
  toAmount: string;
  estimatedTime: string;
  fees: {
    gas: string;
    bridge: string;
    total: string;
  };
  route: string;
  bridgeUsed: string;
  priceImpact: string;
}

const getChainIdFromChainName = function (name: string): ChainId {
  const lowerCaseName = name.toLowerCase();
  if (lowerCaseName === "eth") {
    return ChainId.ETH;
  }
  if (lowerCaseName === "sol") {
    return ChainId.SOL;
  }
  if (lowerCaseName === "bsc") {
    return ChainId.BSC;
  }
  return ChainId.SOL;
};

const getNativeTokenName = function (chainName: string): string {
  const lowerCaseName = chainName.toLowerCase();
  if (lowerCaseName === "eth") {
    return "ETH";
  }
  if (lowerCaseName === "sol") {
    return "SOL";
  }
  if (lowerCaseName === "bsc") {
    return "BNB";
  }
  return "SOL";
};

@Injectable()
export class LiFiCrossChainService {
  private readonly logger = new Logger(LiFiCrossChainService.name);
  private readonly LIFI_API_URL = "https://li.quest/v1";

  // Chain IDs mapping
  private readonly CHAIN_IDS = {
    ETH: "1",
    SOL: "1151111081099710",
    BSC: "56",
  };

  // Native token addresses
  private readonly NATIVE_TOKENS = {
    ETH: "0x0000000000000000000000000000000000000000",
    SOL: "11111111111111111111111111111111",
    BSC: "0x0000000000000000000000000000000000000000",
  };

  // Explorer URLs
  private readonly EXPLORERS = {
    ETH: "https://etherscan.io",
    SOL: "https://solscan.io",
    BSC: "https://bscscan.com",
  };

  constructor() {}

  /**
   * Get quote for cross-chain swap
   */
  async getQuote(params: CrossChainSwapParams): Promise<CrossChainQuote> {
    try {
      this.logger.log(
        `Getting quote: ${params.sourceChain} → ${params.targetChain}`,
      );

      const response = await axios.get(`${this.LIFI_API_URL}/quote`, {
        params: {
          fromChain: getChainIdFromChainName(params.sourceChain),
          toChain: getChainIdFromChainName(params.targetChain),
          fromToken: params.sourceTokenAddress,
          toToken: params.targetTokenAddress,
          fromAmount: params.sourceAmount,
          fromAddress: params.sourceWalletAddress,
          toAddress: params.targetWalletAddress,
        },
      });

      const quote = response.data;

      return {
        fromAmount: quote.action.fromAmount,
        toAmount: quote.estimate.toAmount,
        estimatedTime: this.formatTime(quote.estimate.executionDuration),
        fees: {
          gas: quote.estimate.gasCosts?.[0]?.amount || "0",
          bridge: quote.estimate.feeCosts?.[0]?.amount || "0",
          total: this.calculateTotalFees(quote.estimate),
        },
        route: this.formatRoute(quote),
        bridgeUsed: quote.toolDetails?.name || "Unknown",
        priceImpact: quote.estimate.priceImpact || "0",
      };
    } catch (error: any) {
      this.logger.error("Failed to get quote:", error);
      const errorMsg =
        error?.response?.data?.message || error?.message || "Unknown error";
      throw new Error(`Quote failed: ${errorMsg}`);
    }
  }

  /**
   * Execute cross-chain swap with enhanced status tracking
   */
  async executeSwap(
    params: CrossChainSwapParams,
  ): Promise<CrossChainSwapResult> {
    const startTime = Date.now();
    let finalStatus: "DONE" | "FAILED" | "PENDING" | "NOT_STARTED" =
      "NOT_STARTED";
    const executionSteps: Array<{
      stepIndex: number;
      txHash: string;
      status: string;
      chainId: number;
      type: string;
      timestamp: number;
    }> = [];

    try {
      this.logger.log(
        `Starting cross-chain swap: ${params.sourceChain} → ${params.targetChain}`,
      );

      // 1. convert amount to integer
      const intAmount = await this.toIntegerAmount(
        params.sourceAmount,
        params.sourceChain,
        params.sourceTokenAddress,
      );
      // 2. use the converted amount
      const swapParams = { ...params, sourceAmount: intAmount };

      // Configure providers (keep your original logic)
      if (getChainIdFromChainName(swapParams.sourceChain) === ChainId.ETH) {
        const priKey = normalizeHexPrefix(swapParams.sourcePrivateKey);
        const account = privateKeyToAccount(priKey as `0x${string}`);
        const client = createWalletClient({
          account,
          chain: mainnet,
          transport: http(),
        });

        createConfig({
          integrator: "TheThing",
          providers: [
            EVM({
              getWalletClient: async () => client,
            }),
          ],
        });
      } else if (
        getChainIdFromChainName(swapParams.sourceChain) === ChainId.BSC
      ) {
        const priKey = normalizeHexPrefix(swapParams.sourcePrivateKey);
        const account = privateKeyToAccount(priKey as `0x${string}`);
        const client = createWalletClient({
          account,
          chain: bsc,
          transport: http(),
        });

        createConfig({
          integrator: "TheThing",
          providers: [
            EVM({
              getWalletClient: async () => client,
            }),
          ],
        });
      } else if (
        getChainIdFromChainName(swapParams.sourceChain) === ChainId.SOL
      ) {
        const walletAdapter = new KeypairWalletAdapter(
          swapParams.sourcePrivateKey,
        );

        createConfig({
          integrator: "TheThing",
          providers: [
            Solana({
              getWalletAdapter: async () => walletAdapter,
            }),
          ],
        });
      }

      // Get routes
      const result = await getRoutes({
        fromChainId: getChainIdFromChainName(swapParams.sourceChain),
        toChainId: getChainIdFromChainName(swapParams.targetChain),
        fromTokenAddress:
          swapParams.sourceTokenAddress ??
          getNativeTokenName(swapParams.sourceChain),
        toTokenAddress:
          swapParams.targetTokenAddress ??
          getNativeTokenName(swapParams.targetChain),
        fromAmount: swapParams.sourceAmount,
        fromAddress: swapParams.sourceWalletAddress,
        toAddress: swapParams.targetWalletAddress,
      });

      if (!result.routes || result.routes.length === 0) {
        throw new Error("No routes found for the specified swap");
      }

      const route = result.routes[0];
      this.logger.log(`Route selected with ${route.steps.length} steps`);

      // Execute route with enhanced monitoring
      const executedRoute = await new Promise((resolve, reject) => {
        executeRoute(route, {
          updateRouteHook: (routeUpdate: any) => {
            this.logger.log(`Route execution update: ${routeUpdate.status}`);

            // Track execution steps
            if (routeUpdate.steps) {
              routeUpdate.steps.forEach((step: any, stepIndex: number) => {
                if (step.execution?.process) {
                  step.execution.process.forEach((process: any) => {
                    if (process.txHash && process.status) {
                      const existingStep = executionSteps.find(
                        (s) => s.txHash === process.txHash,
                      );

                      if (!existingStep) {
                        executionSteps.push({
                          stepIndex,
                          txHash: process.txHash,
                          status: process.status,
                          chainId: step.action?.fromChainId || 0,
                          type: process.type || "unknown",
                          timestamp: Date.now(),
                        });

                        this.logger.log(
                          `New transaction: ${process.txHash} - ${process.status}`,
                        );
                      } else {
                        existingStep.status = process.status;
                        existingStep.timestamp = Date.now();
                      }
                    }
                  });
                }
              });
            }

            // Update status
            if (routeUpdate.status === "DONE") {
              finalStatus = "DONE";
              this.logger.log("Route execution completed successfully");
              resolve(routeUpdate);
            } else if (routeUpdate.status === "FAILED") {
              finalStatus = "FAILED";
              const errorMsg = `Route execution failed: ${routeUpdate.message || "Unknown error"}`;
              this.logger.error(errorMsg);
              reject(new Error(errorMsg));
            } else if (routeUpdate.status === "PENDING") {
              finalStatus = "PENDING";
            }
          },
        })
          .then((result: any) => {
            this.logger.log("Execute route promise resolved");
            if (finalStatus !== "DONE") {
              resolve(result);
            }
          })
          .catch((error: any) => {
            finalStatus = "FAILED";
            const errorMsg = error?.message || String(error);
            this.logger.error("Execute route promise rejected:", errorMsg);
            reject(error);
          });

        // Timeout after 15 minutes
        setTimeout(
          () => {
            if (finalStatus !== "DONE" && finalStatus !== "FAILED") {
              finalStatus = "FAILED";
              reject(new Error("Route execution timeout (15 minutes)"));
            }
          },
          15 * 60 * 1000,
        );
      });

      const totalExecutionTime = Date.now() - startTime;

      // Extract transaction hash from execution steps
      const firstTxHash =
        executionSteps.length > 0
          ? executionSteps[0].txHash
          : (executedRoute as any)?.steps?.[0]?.execution?.process?.[0]?.txHash;

      // Build explorer URL
      const explorerUrl = firstTxHash
        ? this.buildExplorerUrl(params.sourceChain, firstTxHash)
        : undefined;

      // Extract amount out
      const amountOut = (executedRoute as any)?.toAmount || route.toAmount;

      // Calculate fees
      const fees = this.calculateFeesFromRoute(executedRoute as any);

      this.logger.log(
        `Cross-chain swap completed successfully in ${totalExecutionTime}ms`,
      );

      return {
        success: true,
        transactionHash: firstTxHash,
        explorerUrl,
        estimatedTime: this.formatTime(
          route.steps.reduce(
            (sum: number, step: any) =>
              sum + (step.estimate?.executionDuration || 0),
            0,
          ),
        ),
        bridgeUsed:
          route.steps.find((step: any) => step.type === "cross")?.tool ||
          "Unknown",
        fees,
        amountOut,
        quote: executedRoute,
        executionSteps,
        finalStatus,
        totalExecutionTime,
        routeId: route.id,
      };
    } catch (error: any) {
      const totalExecutionTime = Date.now() - startTime;
      const errorMessage = error?.message || String(error);

      this.logger.error(
        `Cross-chain swap failed after ${totalExecutionTime}ms:`,
        errorMessage,
      );

      return {
        success: false,
        error: errorMessage,
        executionSteps,
        finalStatus: "FAILED",
        totalExecutionTime,
      };
    }
  }

  /**
   * Build explorer URL for transaction
   */
  private buildExplorerUrl(
    chainName: "ETH" | "SOL" | "BSC",
    txHash: string,
  ): string {
    if (!txHash) return "";
    const baseUrl = this.EXPLORERS[chainName];
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Calculate fees from executed route
   */
  private calculateFeesFromRoute(executedRoute: any): {
    gas: string;
    bridge: string;
    total: string;
  } {
    let totalGas = "0";
    let totalBridge = "0";

    if (executedRoute?.steps) {
      executedRoute.steps.forEach((step: any) => {
        if (step.execution?.process) {
          step.execution.process.forEach((process: any) => {
            if (process.gasUsed && process.gasPrice) {
              const gasFee = ethers.BigNumber.from(process.gasUsed)
                .mul(ethers.BigNumber.from(process.gasPrice))
                .toString();
              totalGas = ethers.BigNumber.from(totalGas).add(gasFee).toString();
            }
          });
        }

        if (step.estimate?.feeCosts) {
          step.estimate.feeCosts.forEach((feeCost: any) => {
            totalBridge = ethers.BigNumber.from(totalBridge)
              .add(feeCost.amount)
              .toString();
          });
        }
      });
    }

    const total = ethers.BigNumber.from(totalGas).add(totalBridge).toString();
    return { gas: totalGas, bridge: totalBridge, total };
  }

  /**
   * Get route from Li-Fi API
   */
  private async getRoute(params: CrossChainSwapParams): Promise<any> {
    const routeRequest = {
      fromChainId: this.CHAIN_IDS[params.sourceChain],
      toChainId: this.CHAIN_IDS[params.targetChain],
      fromTokenAddress:
        params.sourceTokenAddress || this.NATIVE_TOKENS[params.sourceChain],
      toTokenAddress:
        params.targetTokenAddress || this.NATIVE_TOKENS[params.targetChain],
      fromAmount: params.sourceAmount,
      fromAddress: params.sourceWalletAddress,
      toAddress: params.targetWalletAddress,
      options: {
        slippage: (params.slippage || 3) / 100,
        allowBridges: params.allowBridges,
      },
    };

    const response = await axios.get(`${this.LIFI_API_URL}/routes`, {
      params: routeRequest,
      headers: {
        accept: "application/json",
      },
    });

    return response.data.routes?.[0]; // Return best route
  }

  /**
   * Execute EVM transaction (Ethereum, BSC, Polygon)
   */
  private async executeEVMTransaction(
    route: any,
    params: CrossChainSwapParams,
  ): Promise<any> {
    // Get transaction data from Li-Fi
    const txDataResponse = await axios.post(
      `${this.LIFI_API_URL}/stepTransaction`,
      {
        route: route,
      },
    );

    const txData = txDataResponse.data.transactionRequest;

    // Set up provider and wallet
    // Ensure only EVM chains are passed to getRpcUrl
    if (params.sourceChain === "SOL") {
      throw new Error("Solana is not supported for EVM transactions");
    }
    const rpcUrl = this.getRpcUrl(params.sourceChain as "ETH" | "BSC" | "SOL");
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(params.sourcePrivateKey, provider);

    // Execute transaction
    const transaction = {
      to: txData.to,
      data: txData.data,
      value: txData.value || "0",
      gasLimit: txData.gasLimit,
      gasPrice: params.maxGasPrice
        ? ethers.BigNumber.from(params.maxGasPrice)
        : undefined,
    };

    const txResponse = await wallet.sendTransaction(transaction);
    const receipt = await txResponse.wait();

    return {
      transactionHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Execute Solana transaction
   */
  private async executeSolanaTransaction(
    route: any,
    params: CrossChainSwapParams,
  ): Promise<any> {
    // This would require Solana-specific implementation
    // For now, we'll throw an error indicating Solana support needs to be implemented
    throw new Error(
      "Solana transaction execution not yet implemented. Please use EVM chains for now.",
    );
  }

  /**
   * Monitor transaction status
   */
  private async monitorTransaction(txHash: string, route: any): Promise<any> {
    // Poll Li-Fi status endpoint
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes with 10-second intervals

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${this.LIFI_API_URL}/status`, {
          params: {
            bridge: route.toolDetails.key,
            fromChain: route.action.fromChainId,
            toChain: route.action.toChainId,
            txHash: txHash,
          },
        });

        const status = statusResponse.data;

        if (status.status === "DONE") {
          return status;
        } else if (status.status === "FAILED") {
          throw new Error("Cross-chain transaction failed");
        }

        // Wait 10 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 10000));
        attempts++;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        this.logger.warn(
          `Status check attempt ${attempts} failed: ${errorMsg}`,
        );
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    throw new Error("Transaction monitoring timeout");
  }

  /**
   * Get supported chains
   */
  async getSupportedChains(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.LIFI_API_URL}/chains`, {
        headers: { accept: "application/json" },
      });
      return response.data.chains;
    } catch (error) {
      this.logger.error("Failed to get supported chains:", error);
      return [];
    }
  }

  /**
   * Get supported tokens for a chain
   */
  async getSupportedTokens(chainId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.LIFI_API_URL}/tokens`, {
        params: { chains: chainId },
        headers: { accept: "application/json" },
      });
      return response.data.tokens[chainId] || [];
    } catch (error) {
      this.logger.error("Failed to get supported tokens:", error);
      return [];
    }
  }

  /**
   * Utility functions
   */
  private getRpcUrl(chain: "ETH" | "BSC" | "SOL"): string {
    const urls = {
      ETH:
        process.env.ETHEREUM_RPC_URL ||
        "https://mainnet.infura.io/v3/YOUR_API_KEY",
      BSC: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
      SOL: process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com",
    };
    return urls[chain];
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  private calculateTotalFees(estimate: any): string {
    const gasCost = estimate.gasCosts?.[0]?.amount || "0";
    const feeCost = estimate.feeCosts?.[0]?.amount || "0";
    return (parseFloat(gasCost) + parseFloat(feeCost)).toString();
  }

  private formatRoute(quote: any): string {
    const from = quote.action.fromToken.symbol;
    const to = quote.action.toToken.symbol;
    const bridge = quote.toolDetails.name;
    return `${from} → ${to} via ${bridge}`;
  }

  /**
   * Helper: Convert human-readable amount to integer string based on decimals
   */
  private async toIntegerAmount(
    amount: string,
    chain: keyof typeof this.CHAIN_IDS,
    tokenAddress?: string,
  ): Promise<string> {
    let decimals = 18;
    try {
      const chainId = this.CHAIN_IDS[chain];
      const tokens = await this.getSupportedTokens(chainId);
      let tokenMeta;
      if (!tokenAddress || tokenAddress === this.NATIVE_TOKENS[chain]) {
        // Native token
        tokenMeta = tokens.find(
          (t: any) => t.address === this.NATIVE_TOKENS[chain],
        );
      } else {
        tokenMeta = tokens.find(
          (t: any) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
        );
      }
      if (tokenMeta && tokenMeta.decimals) {
        decimals = tokenMeta.decimals;
      }
    } catch (e) {
      this.logger.warn("Failed to fetch token decimals, fallback to 18:", e);
    }

    const [whole, fraction = ""] = String(amount).split(".");
    const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
    const intStr = whole + paddedFraction;
    // Remove leading zeros
    return intStr.replace(/^0+/, "") || "0";
  }
}
