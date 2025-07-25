import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import {
  TradingParams,
  TradingService,
} from "../../workers/trading/trading.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WalletsService } from "@databases/wallets/wallets.service";
import { LimitsService } from "@databases/limits/limits.service";
import { CreateLimitOrderDto } from "@databases/limits/limits.dto.request";
import { Limits } from "@databases/limits/limits.entity";
import { TPSLSetting } from "@workers/limit-trigger/limit-trigger.types";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

/**
 * Controller for trading-related endpoints including market orders and limit orders.
 */
@Controller("api")
export class TradingController {
  constructor(
    private readonly tradingService: TradingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly walletService: WalletsService,
    private readonly limitsService: LimitsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Post("trade")
  async trade(@Body() body: any) {
    if (body.order_type === "limit") {
      return await this.createLimitFromMarketRequest(body);
    }
    const tradeParams: TradingParams = {
      sourceChain: body.src_network.toUpperCase(),
      sourceWalletAddress: body.src_wallet,
      sourcePrivateKey: "",
      sourceNativeAmount: body.amount_in,
      targetChain: body.tar_network.toUpperCase(),
      targetWalletAddress: body.tar_wallet,
      targetPrivateKey: "",
      memeTokenAddress: body.token_address,
      action: body.bid_type,
      memeTokenAmount: body.amount_in,
      slippage: body.slippage,

      // *** NEW: TP/SL settings for market orders ***
      tpslSettings: body.tp_sl_config
        ? this.parseTPSLSettings(body.tp_sl_config)
        : undefined,
    };

    // find the wallets
    const sourceWallet = await this.walletService.findByAddress(
      tradeParams.sourceWalletAddress,
      tradeParams.sourceChain,
    );
    const swapWallet = await this.walletService.findByAddress(
      tradeParams.targetWalletAddress,
      tradeParams.targetChain,
    );

    tradeParams.sourcePrivateKey = sourceWallet?.private_key || "";
    tradeParams.targetPrivateKey = swapWallet?.private_key || "";

    this.eventEmitter.emit(
      "trade.started",
      tradeParams.sourceWalletAddress,
      tradeParams.targetWalletAddress,
      tradeParams.memeTokenAddress,
      tradeParams.memeTokenAmount,
    );

    this.tradingService
      .tradeMemeCoin(tradeParams)
      .then((result) => {
        this.eventEmitter.emit("trade.finished", result);
      })
      .catch((error) => {
        this.eventEmitter.emit("trade.failed", error);
      });

    return { status: "started" };
  }

  async createLimitFromMarketRequest(@Body() body: any) {
    const walletAddress = body.src_wallet;
    const network = body.src_network;
    const tokenAddress = body.token_address;
    const bidType = body.bid_type;
    const orderPrice = body.order_price;
    const amountIn = body.amount_in;

    const redisKey = `datas:${network}:${tokenAddress}`;
    const cached = await this.redis.get(redisKey);
    let currentPrice = 0;
    if (cached) {
      try {
        const item = JSON.parse(cached);
        currentPrice = Number(item.price) || 0;
      } catch {
        currentPrice = 0;
      }
    }

    let orderType = "";
    if (bidType === "buy") {
      if (body.order_price <= currentPrice) {
        orderType = "limit";
      } else {
        orderType = "stop";
      }
    } else {
      if (body.order_price >= currentPrice) {
        orderType = "limit";
      } else {
        orderType = "stop";
      }
    }

    const limitOrder: CreateLimitOrderDto = {
      wallet_address: walletAddress,
      network: network,
      token_address: tokenAddress,
      order_price: orderPrice,
      mc: body.mc,
      action: body.bid_type,
      amount_in: amountIn,
      order_type: orderType,
      status: "waiting",
      extra: body.tp_sl_config,
    };

    const result = await this.limitsService.createLimitOrder(limitOrder);

    this.eventEmitter.emit("token.limits_info", [result]);
    return { success: true, message: "create limit order successed" };
  }

  @Post("limit")
  async createLimit(@Body() body: any) {
    const redisKey = `datas:${body.network}:${body.token_address}`;
    const cached = await this.redis.get(redisKey);
    let currentPrice = 0;
    if (cached) {
      try {
        const item = JSON.parse(cached);
        currentPrice = Number(item.price) || 0;
      } catch {
        currentPrice = 0;
      }
    }

    let order_type = "";
    if (body.bid_type === "buy") {
      if (body.order_price <= currentPrice) {
        order_type = "limit";
      } else {
        order_type = "stop";
      }
    } else {
      if (body.order_price >= currentPrice) {
        order_type = "limit";
      } else {
        order_type = "stop";
      }
    }

    const limitOrder: CreateLimitOrderDto = {
      wallet_address: body.wallet_address,
      network: body.network,
      token_address: body.token_address,
      order_price: body.order_price,
      mc: body.mc,
      action: body.bid_type,
      amount_in: body.amount_in,
      order_type,
      status: "waiting",
      extra: body.tp_sl_config,
    };

    const result = await this.limitsService.createLimitOrder(limitOrder);

    this.eventEmitter.emit("token.limits_info", [result]);

    return { success: true, message: "create limit order successed" };
  }

  /**
   * Parse TP/SL settings from request body
   * - If tpsl_settings is a url-encoded JSON string, decode and parse it.
   * - Expected decoded format:
   *   [
   *     { trigger_value: 120, sell_percentage: 50 },
   *     { trigger_value: -50, sell_percentage: 100 }
   *   ]
   */
  private parseTPSLSettings(tpslData: any): TPSLSetting[] {
    let parsed: any[] = [];

    if (typeof tpslData === "string") {
      try {
        // URL decode and parse JSON
        const decoded = decodeURIComponent(tpslData);
        parsed = JSON.parse(decoded);
      } catch (e) {
        return [];
      }
    } else if (Array.isArray(tpslData)) {
      parsed = tpslData;
    } else {
      return [];
    }

    return parsed
      .map((setting, index) => ({
        trigger_value: parseFloat(setting.trigger_value ?? 0),
        sell_percentage:
          setting.sell_percentage !== undefined
            ? parseFloat(setting.sell_percentage)
            : undefined,
      }))
      .filter(
        (setting) =>
          !isNaN(setting.trigger_value) &&
          (setting.sell_percentage === undefined ||
            setting.sell_percentage > 0),
      );
  }
}
