import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

import { Limits } from "@databases/limits/limits.entity";
import { getCurrentTimeStamp } from "@common/utils";
import {
  TPSLPositionConfig,
  TPSLSetting,
} from "@workers/limit-trigger/limit-trigger.types";
import Logger from "@common/logger";
import { BaseTokenTrade } from "@workers/bitquery/bitquery.types";
import {
  TradingParams,
  TradingService,
} from "../../workers/trading/trading.service";
import { WalletsService } from "@databases/wallets/wallets.service";
import { TransactionsService } from "@databases/transactions/transactions.service";
import { CreateLimitOrderDto } from "@databases/limits/limits.dto.request";

@Injectable()
export class LimitTriggerService {
  // Trigger condition sets for tokens - monitors limit orders for price triggers
  private triggerConditions = new Map<string, Limits[]>();

  // Price cache for tokens to avoid duplicate calculations
  private tokenPriceCache = new Map<
    string,
    { price: number; timestamp: number }
  >();

  // Lock for concurrency
  private processingLock = new Set<string>();

  // Configuration constants
  private readonly TPSL_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes expiry for TPSL configs
  private readonly PRICE_CACHE_MS = 30 * 1000; // 30 seconds price cache

  constructor(
    @InjectRepository(Limits)
    private readonly limitsRepository: Repository<Limits>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => TradingService))
    private readonly tradingService: TradingService,
    private readonly transactionService: TransactionsService,
    private readonly walletService: WalletsService,
  ) {}

  async onModuleInit() {
    await this.loadWaitingTriggersFromDB();
    this.startCleanupTimer();
  }

  /**
   * Store TPSL configuration when user places a position order
   */
  async registerTPSLConfig(config: {
    userId: string;
    walletAddress: string;
    tokenAddress: string;
    network: string;
    orderType: "buy" | "sell";
    expectedAmount: number;
    expectedTxHash: string;
    tpslSettings: TPSLSetting[];
  }): Promise<string> {
    const expiresAt = new Date(Date.now() + this.TPSL_EXPIRY_MS);

    const tpslConfig: TPSLPositionConfig = {
      userId: config.userId,
      walletAddress: config.walletAddress,
      tokenAddress: config.tokenAddress,
      network: config.network,
      orderType: config.orderType,
      expectedAmount: config.expectedAmount,
      expectedTxHash: config.expectedTxHash,
      tpslSettings: config.tpslSettings,
      createdAt: new Date(),
      expiresAt: expiresAt,
    };

    // Start polling for the transaction in the DB (non-blocking)
    this.pollAndCreateLimitOrders(tpslConfig);

    return config.expectedTxHash;
  }

  /**
   * Poll for the transaction in the DB and create limit orders when found
   */
  private async pollAndCreateLimitOrders(
    tpslConfig: TPSLPositionConfig,
  ): Promise<void> {
    const timeoutMs = 10000;
    const pollInterval = 500;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const tx = await this.transactionService.findByHash(
        tpslConfig.expectedTxHash,
      );
      if (tx) {
        Logger.getInstance().info(
          `TPSL: Transaction found in DB, creating limit orders for txHash ${tpslConfig.expectedTxHash}`,
        );
        // You may need to fetch trade info for price/amount, or pass tx as needed
        await this.createLimitOrdersFromTPSL(tpslConfig, tx);
        return;
      }
      await new Promise((res) => setTimeout(res, pollInterval));
    }
    Logger.getInstance().warn(
      `TPSL: Transaction not found in DB within timeout: ${tpslConfig.expectedTxHash}`,
    );
  }

  /**
   * Handle incoming DEX trade data to check for position confirmations
   */
  @OnEvent("token.traded")
  async handleDexTrade(tradeData: BaseTokenTrade[]): Promise<void> {
    // Update price cache and check existing limit orders for triggers
    await this.updatePriceAndCheckTriggers(tradeData);
  }

  @OnEvent("trade.tpsl.register")
  async handleTPSLRegister(config: {
    userId: string;
    walletAddress: string;
    tokenAddress: string;
    network: string;
    orderType: "buy" | "sell";
    expectedAmount: number;
    expectedTxHash: string;
    tpslSettings: TPSLSetting[];
  }): Promise<void> {
    this.registerTPSLConfig(config);
  }

  /**
   *
   * @param orderData Handle the events for new limit orders
   */
  @OnEvent("token.limits_info")
  async handleLimitOpened(orderDatas: Limits[]) {
    for (const orderData of orderDatas) {
      await this.updateTriggerConditions(
        `${orderData.network}:${orderData.token_address}`,
      );
    }
  }

  /**
   * Update price cache and check all limit orders for trigger conditions
   */
  private async updatePriceAndCheckTriggers(
    tradeDatas: BaseTokenTrade[],
  ): Promise<void> {
    for (const tradeData of tradeDatas) {
      // TODO: Test Code
      const tokenKey = `${this.getNetworkFromTrade(tradeData)}:${this.getTokenAddressFromTrade(tradeData)}`;
      // const tokenKey = "sol:3SVz9hSFfPB2Pnm22VUkxTQvWvziDQhH3ydxsZPopump";
      const currentPrice = this.calculatePriceFromTrade(tradeData);

      // Check triggers for this token
      const triggersForToken = this.triggerConditions.get(tokenKey);
      if (!triggersForToken || triggersForToken.length === 0) {
        return;
      }

      // Prevent concurrent processing
      if (this.processingLock.has(tokenKey)) {
        return;
      }
      this.processingLock.add(tokenKey);

      try {
        const triggeredOrders = this.checkPriceTriggers(
          triggersForToken,
          currentPrice,
        );

        if (triggeredOrders.length > 0) {
          Logger.getInstance().info(
            `Found ${triggeredOrders.length} triggered orders for ${tokenKey} at price $${currentPrice}`,
          );
          await this.executeTriggeredOrders(triggeredOrders);
          await this.updateTriggerConditions(tokenKey);
        }
      } finally {
        this.processingLock.delete(tokenKey);
      }
    }
  }

  /**
   * Check which limit orders should be triggered based on current price
   */
  private checkPriceTriggers(orders: Limits[], currentPrice: number): Limits[] {
    return orders.filter((order) => {
      if (order.status !== "waiting") return false;

      const triggerPrice = parseFloat(order.order_price?.toString() || "0");
      if (triggerPrice <= 0) return false;

      // Check trigger conditions based on order type
      if (order.order_type === "limit") {
        if (order.action === "buy") {
          return currentPrice <= triggerPrice;
        } else {
          return currentPrice >= triggerPrice;
        }
      } else {
        if (order.action === "buy") {
          return currentPrice >= triggerPrice;
        } else {
          return currentPrice <= triggerPrice;
        }
      }
    });
  }

  /**
   * Execute triggered limit orders
   */
  private async executeTriggeredOrders(orders: Limits[]): Promise<void> {
    for (const order of orders) {
      try {
        // Update order status to triggered
        let update = await this.limitsRepository.update(order.id, {
          status: "triggered",
        });

        // Execute the trade
        // 1. Get private key for the wallet (implement your own secure key management)
        const wallet = await this.walletService.findByAddress(
          order.wallet_address,
          order.network,
        );
        if (wallet === undefined || wallet === null) {
          // Update order status to failed
          update = await this.limitsRepository.update(order.id, {
            status: "failed",
            error: "Not exist wallet",
          });
          return;
        }
        this.eventEmitter.emit("token.limits_info", update);

        const privateKey = wallet.private_key;

        // If action is buy and TPSL(extra) exists, parse and attach tpslSettings
        let tpslSettings = undefined;
        if (order.action === "buy" && order.extra) {
          try {
            const extra = JSON.parse(order.extra);
            if (extra.tpslSettings) {
              tpslSettings = extra.tpslSettings;
            }
          } catch (e) {
            // ignore parse error
          }
        }

        // 2. Map order fields to TradingParams for tradeMemeCoin
        const chain = order.network.toUpperCase() as "ETH" | "SOL" | "BSC";

        const params: TradingParams = {
          sourceChain: chain,
          sourceWalletAddress: order.wallet_address,
          sourcePrivateKey: privateKey,
          sourceNativeAmount: order.amount_in,
          targetChain: chain,
          targetWalletAddress: order.wallet_address,
          targetPrivateKey: privateKey,
          memeTokenAddress: order.token_address,
          action: order.action as "buy" | "sell",
          memeTokenAmount: order.amount_in,
          slippage: 30.0,
          ...(tpslSettings ? { tpslSettings } : {}),
        };

        // 3. Call tradeMemeCoin instead of executeLimitOrder
        const tradeResult = await this.tradingService.tradeMemeCoin(params);

        if (tradeResult.success) {
          // Update order status to executed
          const updated = await this.limitsRepository.save({
            ...order,
            status: "success",
            extra: JSON.stringify({
              ...JSON.parse(order.extra || "{}"),
              execution_tx: tradeResult.transactionHash,
              execution_price: this.tokenPriceCache.get(
                `${order.network}:${order.token_address}`,
              )?.price,
              executed_at: new Date().toISOString(),
            }),
          });

          Logger.getInstance().info(
            `Successfully executed limit order ${order.id}, tx: ${tradeResult.transactionHash}`,
          );
          this.eventEmitter.emit("token.limits_info", updated);
        } else {
          // Update order status to failed
          const updated = await this.limitsRepository.update(order.id, {
            status: "failed",
            error: tradeResult.error || "Trade execution failed",
          });

          Logger.getInstance().error(
            `Failed to execute limit order ${order.id}: ${tradeResult.error}`,
          );

          this.eventEmitter.emit("token.limits_info", updated);
        }
      } catch (error) {
        Logger.getInstance().error(
          `Error processing triggered order ${order.id}:`,
          error,
        );

        // Update order status to failed
        const updated = await this.limitsRepository.update(order.id, {
          status: "failed",
          error:
            error && typeof error === "object" && "message" in error
              ? (error as any).message
              : "Unknown error during execution",
        });
        this.eventEmitter.emit("token.limits_info", updated);
      }
    }
  }

  /**
   * Create limit orders from TPSL config and transaction (tx)
   * - tx should have enough info for price/amount, or you may need to fetch more details
   */
  private async createLimitOrdersFromTPSL(
    config: TPSLPositionConfig,
    tx: any, // Replace with your actual transaction entity type
  ): Promise<Limits[]> {
    // You must implement logic to extract entryPrice and totalAmount from tx
    // For now, use config.expectedAmount as totalAmount and a dummy price
    const entryPrice = tx.price; // TODO: get actual entry price from tx or related trade info
    const totalAmount = tx.tokenAmount;

    const orders: Limits[] = [];

    for (let i = 0; i < config.tpslSettings.length; i++) {
      const setting = config.tpslSettings[i];
      if (!setting || !setting.sell_percentage || !setting.trigger_value)
        continue;
      if (setting.sell_percentage === 100 && setting.trigger_value === -100)
        continue;

      const triggerPrice = entryPrice * (1 + setting.trigger_value / 100);
      const type = setting.trigger_value > 0 ? "limit" : "stop";
      const orderType = type;
      const action = "sell";
      const amountToSell = totalAmount * (setting.sell_percentage / 100);

      const order = new Limits();
      Object.assign(order, {
        network: config.network,
        wallet_address: config.walletAddress,
        token_address: config.tokenAddress,
        amount_in: amountToSell.toString(),
        status: "waiting",
        mc: null,
        order_price: triggerPrice,
        action,
        error: null,
        extra: JSON.stringify({
          tpsl_type: type,
          parent_tx_hash: config.expectedTxHash,
          config_id: config.userId,
          setting_id: `tpsl_${Date.now()}_${i}`,
          percentage: setting.sell_percentage,
          original_trade_amount: totalAmount,
          original_trade_price: entryPrice,
          trigger_value: setting.trigger_value,
        }),
        order_type: orderType,
      });

      const savedOrder = await this.limitsRepository.save(order);
      orders.push(savedOrder);
    }

    Logger.getInstance().info(
      `Created ${orders.length} TPSL limit orders for txHash ${config.expectedTxHash}`,
    );
    this.eventEmitter.emit("token.limits_info", orders);
    return orders;
  }

  /**
   * Update trigger conditions for a token after processing
   */
  private async updateTriggerConditions(tokenKey: string): Promise<void> {
    const [network, tokenAddress] = tokenKey.split(":");

    // Reload waiting orders for this token from database
    const waitingOrders = await this.limitsRepository.find({
      where: {
        network: network,
        token_address: tokenAddress,
        status: "waiting",
      },
    });

    if (waitingOrders.length === 0) {
      this.triggerConditions.delete(tokenKey);
      Logger.getInstance().info(
        `Stopped monitoring token ${tokenKey} - no waiting orders`,
      );
    } else {
      this.triggerConditions.set(tokenKey, waitingOrders);
      Logger.getInstance().info(
        `Updated monitoring for token ${tokenKey}: ${waitingOrders.length} waiting orders`,
      );
    }
  }

  /**
   * Extract network from trade data
   */
  private getNetworkFromTrade(trade: BaseTokenTrade): string {
    // Determine network based on trade data structure
    // This might need adjustment based on how your bitquery data is structured
    if (trade.buy.address.length > 40) return "sol"; // Solana addresses are longer
    if (trade.buy.address.startsWith("0x")) {
      // Could be ETH or BSC - might need additional logic to distinguish
      return "eth"; // Default to ETH for now
    }
    return "unknown";
  }

  /**
   * Extract token address from trade data
   */
  private getTokenAddressFromTrade(trade: BaseTokenTrade): string {
    // Assuming the token being traded is in the buy side for buy orders
    return trade.buy.address;
  }

  /**
   * Calculate current price from trade data
   */
  private calculatePriceFromTrade(trade: BaseTokenTrade): number {
    const buyAmountUSD = parseFloat(trade.buy.amountInUSD);
    const sellAmountUSD = parseFloat(trade.sell.amountInUSD);
    const buyAmount = parseFloat(trade.buy.amount);
    const sellAmount = parseFloat(trade.sell.amount);

    // Calculate price based on USD amounts vs token amounts
    if (sellAmount > 0 && buyAmountUSD > 0) {
      return buyAmountUSD / sellAmount;
    } else if (buyAmount > 0 && sellAmountUSD > 0) {
      return sellAmountUSD / buyAmount;
    }

    return 0;
  }

  /**
   * Load existing waiting triggers from database
   */
  private async loadWaitingTriggersFromDB(): Promise<void> {
    try {
      const waitingTriggers = await this.limitsRepository.find({
        where: { status: "waiting" },
      });

      // Group by token for monitoring
      const tokenGroups = waitingTriggers.reduce(
        (acc, trigger) => {
          const key = `${trigger.network}:${trigger.token_address}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(trigger);
          return acc;
        },
        {} as Record<string, Limits[]>,
      );

      // Load into trigger conditions map
      for (const [tokenKey, triggers] of Object.entries(tokenGroups)) {
        this.triggerConditions.set(tokenKey, triggers);
      }

      Logger.getInstance().info(
        `Loaded ${waitingTriggers.length} waiting triggers for ${Object.keys(tokenGroups).length} tokens`,
      );
    } catch (error) {
      Logger.getInstance().error(
        "Failed to load waiting triggers from DB:",
        error,
      );
    }
  }

  /**
   * Start cleanup timer for expired configurations and triggers
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredConditions();
      this.cleanupPriceCache();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired trigger conditions
   */
  private async cleanupExpiredConditions(): Promise<void> {
    const now = new Date();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
    const expiredTriggerIds: string[] = [];

    for (const [tokenAddress, triggers] of this.triggerConditions.entries()) {
      const validTriggers = triggers.filter((trigger) => {
        const isExpired =
          getCurrentTimeStamp() - trigger.timestamp > expirationTime;
        if (isExpired && trigger.status === "waiting") {
          Logger.getInstance().info(
            `Cleaning up expired trigger: ${trigger.id}`,
          );
          expiredTriggerIds.push(trigger.id);
          return false;
        }
        return true;
      });

      if (validTriggers.length === 0) {
        this.triggerConditions.delete(tokenAddress);
      } else {
        this.triggerConditions.set(tokenAddress, validTriggers);
      }
    }

    // Update database for expired triggers
    if (expiredTriggerIds.length > 0) {
      try {
        const updated = await this.limitsRepository.update(expiredTriggerIds, {
          status: "expired",
        });
        this.eventEmitter.emit("token.limits_info", updated);
        Logger.getInstance().info(
          `Cleaned up ${expiredTriggerIds.length} expired triggers from DB`,
        );
      } catch (error) {
        Logger.getInstance().error(
          "Failed to cleanup expired triggers in DB",
          error,
        );
      }
    }
  }

  /**
   * Clean up expired price cache entries
   */
  private cleanupPriceCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, data] of this.tokenPriceCache.entries()) {
      if (now - data.timestamp > this.PRICE_CACHE_MS) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.tokenPriceCache.delete(key);
    }
  }

  /**
   * Generate unique configuration ID
   */
  private generateConfigId(): string {
    return `tpsl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
