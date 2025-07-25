import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, WebSocket } from "ws";
import { OnEvent } from "@nestjs/event-emitter";
import { TokenOutput } from "@rest-api/token.output";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { getISO8601FromTimeStamp } from "@common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tokens } from "@databases/tokens/tokens.entity";
import { Transaction } from "@databases/transactions/transactions.entity";
import Logger from "@common/logger";
import { Limits } from "@databases/limits/limits.entity";
import { DashboardTokenResponse } from "@rest-api/tokens/types/dashboard-token-response.output";
import { TokenTradeCoreType } from "@redis/types/redis.types";
import { BlockchainType } from "@common/constants";

interface Subscription {
  dashboard: boolean;
  network: string;
  trending?: {
    network: string;
    category: string;
    unsubscribe: boolean;
  } | null;
  watchlist?: {
    network: string;
    category: string;
    user_id: string;
    unsubscribe?: boolean;
  } | null;
  transaction_info?: {
    address: string;
    network: string;
    request_id: string;
    unsubscribe?: boolean;
  } | null;
  position_info?: {
    address: string;
    network: string;
    request_id: string;
    wallet: string;
    unsubscribe?: boolean;
  } | null;
  limit_info?: {
    address: string;
    network: string;
    request_id: string;
    user_id: string;
    unsubscribe?: boolean;
  } | null;
  token_detail?: {
    address: string;
    network: string;
    request_id: string;
    unsubscribe?: boolean;
  } | null;
}

@WebSocketGateway({ path: "/ws-plain", transport: ["websocket"] })
export class WsApiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;
  private clients: Set<WebSocket> = new Set();
  private subscriptions: Map<WebSocket, Subscription> = new Map();
  private transactionSubscriptions: Map<WebSocket, { close: () => void }> =
    new Map();
  private mainTokenInfoSubscriptions: Map<WebSocket, { close: () => void }> =
    new Map();
  private tradeSubscriptions: Map<string, WebSocket> = new Map();
  private subscriptionLocks: Map<WebSocket, Promise<void>> = new Map();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(Tokens)
    private readonly tokenRepository: Repository<Tokens>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  @OnEvent("token.dashboard_broadcast_new")
  @OnEvent("token.updated_broadcast")
  @OnEvent("token.mig_com_list_updated")
  handleTokenCreated(data: TokenOutput[]) {
    this.broadcastTokenMain(data);
  }

  @OnEvent("token.updated_broadcast")
  handleTokenUpdated(data: TokenOutput[], trades: TokenTradeCoreType[]) {
    this.broadcastTokenDetail(data, trades);
  }

  @OnEvent("trending.list_updated")
  handleTrendingListUpdated(data: DashboardTokenResponse[]) {
    this.broadcastTrendingTokens(data);
  }

  @OnEvent("trade.occured")
  handleTradeOccured(tradeResult: any) {
    this.broadcastTradeOccured(tradeResult);
    this.broadcastPositionInfo(tradeResult);
  }

  @OnEvent("trade.position_status")
  handleTradeStatus(tradeStatus: any) {
    this.broadcastPendingStatus(tradeStatus);
  }

  @OnEvent("trade.started")
  handleTradeStarted(
    srcWallet: string,
    tarWallet: string,
    tokenAddress: string,
    tokenAmount: number,
  ) {
    this.saveTradeSubscription(srcWallet, tarWallet, tokenAddress, tokenAmount);
  }

  @OnEvent("token.limits_info")
  handleTokenLimitOpened(data: Limits[]) {
    this.broadcastTokenLimitsInfo(data);
  }

  async broadcastTokenLimitsInfo(datas: Limits[]) {
    const limitInfos = [];
    let network = "";
    let tokenAddress = "";
    for (const data of datas) {
      network = data.network;
      tokenAddress = data.token_address;
      const limitInfo = {
        limitId: data.id,
        wallet: data.wallet_address,
        type: data.action,
        token: data.token_address,
        network: data.network,
        amount: Number(data.amount_in),
        order_price: Number(data.order_price),
        limit_type: data.order_type,
        created: data.timestamp ? getISO8601FromTimeStamp(data.timestamp) : "",
        status: data.status ?? "waiting",
      };
      limitInfos.push(limitInfo);
    }

    for (const client of this.clients) {
      const sub = this.subscriptions.get(client);
      if (!sub?.limit_info || client.readyState !== client.OPEN) {
        Logger.getInstance().info("client is opened");
        continue;
      }

      if (
        (sub.limit_info.network &&
          sub.limit_info.network !== network?.toLowerCase()) ||
        (sub.limit_info.address && sub.limit_info.address !== tokenAddress)
      ) {
        continue;
      }

      client.send(
        JSON.stringify({
          channel: "limit_info",
          data: limitInfos,
          request_id: sub.limit_info.request_id,
        }),
      );
    }
  }

  async broadcastWatchlist() {
    for (const client of this.clients) {
      const sub = this.subscriptions.get(client);
      if (!sub?.watchlist || client.readyState !== client.OPEN) continue;
      const { user_id, network, category } = sub.watchlist;
      if (!user_id || !network) continue;

      let volField = "vol_1h";
      let txsField = "txs_1h";
      let calcMode: "direct" | "divide" | "multiply" = "direct";
      let divisor = 1;
      let multiplier = 1;

      switch (category) {
        case "5m":
          volField = "vol_1h";
          txsField = "txs_1h";
          calcMode = "divide";
          divisor = 12;
          break;
        case "15m":
          volField = "vol_1h";
          txsField = "txs_1h";
          calcMode = "divide";
          divisor = 4;
          break;
        case "30m":
          volField = "vol_1h";
          txsField = "txs_1h";
          calcMode = "divide";
          divisor = 2;
          break;
        case "12h":
          volField = "vol_6h";
          txsField = "txs_6h";
          calcMode = "multiply";
          multiplier = 2;
          break;
        case "6h":
          volField = "vol_6h";
          txsField = "txs_6h";
          calcMode = "direct";
          break;
        case "24h":
        case "1d":
          volField = "vol_24h";
          txsField = "txs_24h";
          calcMode = "direct";
          break;
        case "1h":
        default:
          volField = "vol_1h";
          txsField = "txs_1h";
          calcMode = "direct";
          break;
      }

      const key = `watchlist:${user_id}`;
      const members = await this.redis.smembers(key);
      // filter by network
      let addresses: string[] = [];
      if (network.toLowerCase() === "all") {
        addresses = members.map((entry) => entry.split(":").slice(1).join(":"));
      } else {
        addresses = members
          .filter((entry) => entry.startsWith(`${network.toLowerCase()}:`))
          .map((entry) => entry.split(":").slice(1).join(":"));
      }

      const results: any[] = [];
      for (const address of addresses) {
        let dataKeys: string[] = [];
        if (network.toLowerCase() === "all") {
          dataKeys = await this.redis.keys(`datas:*:${address}`);
        } else {
          dataKeys = [`datas:${network.toLowerCase()}:${address}`];
        }
        for (const dataKey of dataKeys) {
          const cachedJson = await this.redis.get(dataKey);
          if (!cachedJson) continue;
          try {
            const item = JSON.parse(cachedJson);

            let vol = Number(item[volField]) || 0;
            let txs = Number(item[txsField]) || 0;
            if (calcMode === "divide" && divisor > 0) {
              vol = vol / divisor;
              txs = txs / divisor;
            } else if (calcMode === "multiply") {
              vol = vol * multiplier;
              txs = txs * multiplier;
            }

            results.push({
              uri: item.uri || "",
              name: item.name || "",
              symbol: item.symbol || "",
              address: item.address || item.token_address || "",
              time: item.time || "",
              network: item.network || network,
              liquidity: Number(item.liquidity) || 0,
              mc: Number(item.mc) || 0,
              holders: Number(item.cnt_holder) || 0,
              txs,
              buy_cnt: txs - Math.round(txs / 3) || 0,
              sell_cnt: Math.round(txs / 3) || 0,
              price: Number(item.price) || 0,
              change: Number(item.one_h_percent) || 0,
              vol,
              degen_audit: item.degen_audit || "",
            });
          } catch {
            // skip invalid json
          }
        }
      }

      if (results) {
        client.send(
          JSON.stringify({
            channel: "watchlist",
            data: results,
          }),
        );
      }
    }
  }

  async broadcastPositionInfo(tradeResult: any) {
    for (const client of this.clients) {
      const sub = this.subscriptions.get(client);
      if (!sub?.position_info || client.readyState !== WebSocket.OPEN) continue;
      const { network, address, request_id, wallet } = sub.position_info;

      const redisKey = `datas:${tradeResult.targetChain.toLowerCase()}:${tradeResult.memeTokenAddress}`;
      const cachedJson = await this.redis.get(redisKey);
      if (cachedJson === "") return;

      let cachedData: any;
      try {
        cachedData = JSON.parse(cachedJson ?? "");
      } catch {
        continue;
      }

      let position_info = null;
      position_info = {
        positionId: tradeResult.positionId,
        status: "success",
        time: getISO8601FromTimeStamp(tradeResult.timestamp),
        type: tradeResult.action ?? "buy",
        total_usd: Number(cachedData.price) * Number(tradeResult.amountOut),
        amount: Number(
          tradeResult.action === "buy"
            ? tradeResult.amountOut
            : tradeResult.amountIn,
        ),
        price: Number(cachedData.price),
        wallet: {
          wallet_address: tradeResult.targetWalletAddress,
          top10holder: false,
          first_buy: false,
        },
      };

      client.send(
        JSON.stringify({
          channel: "position_info",
          data: position_info,
          request_id,
        }),
      );
    }
  }

  async broadcastPendingStatus(tradeStatus: any) {
    for (const client of this.clients) {
      const sub = this.subscriptions.get(client);
      if (!sub?.position_info || client.readyState !== WebSocket.OPEN) continue;
      const { network, address, request_id, wallet } = sub.position_info;

      const redisKey = `datas:${tradeStatus.targetChain.toLowerCase()}:${tradeStatus.memeTokenAddress}`;
      const cachedJson = await this.redis.get(redisKey);
      if (cachedJson === "") return;

      let cachedData: any;
      try {
        cachedData = JSON.parse(cachedJson ?? "");
      } catch {
        continue;
      }

      let position_info = null;
      position_info = {
        positionId: tradeStatus.positionId,
        time: getISO8601FromTimeStamp(tradeStatus.timestamp),
        type: tradeStatus.action ?? "buy",
        total_usd: 0,
        amount: tradeStatus.amountIn,
        price: Number(cachedData.price),
        status: tradeStatus.status,
        wallet: {
          wallet_address: tradeStatus.targetWalletAddress,
          top10holder: false,
          first_buy: false,
        },
      };

      client.send(
        JSON.stringify({
          channel: "position_info",
          data: position_info,
          request_id,
        }),
      );
    }
  }

  async broadcastTrendingTokens(data: DashboardTokenResponse[]) {
    let mappedData: {
      [BlockchainType.SOLANA]: DashboardTokenResponse[];
      [BlockchainType.BSC]: DashboardTokenResponse[];
      [BlockchainType.ETHEREUM]: DashboardTokenResponse[];
    } = {
      [BlockchainType.SOLANA]: data.filter(
        (token) => token.network === BlockchainType.SOLANA,
      ),
      [BlockchainType.BSC]: data.filter(
        (token) => token.network === BlockchainType.BSC,
      ),
      [BlockchainType.ETHEREUM]: data.filter(
        (token) => token.network === BlockchainType.ETHEREUM,
      ),
    };

    for (const client of this.clients) {
      const sub = this.subscriptions.get(client);
      if (!sub?.trending || client.readyState !== WebSocket.OPEN) continue;

      client.send(
        JSON.stringify({
          channel: "trending",
          data:
            sub.trending?.network === "all"
              ? data
              : mappedData[sub.trending?.network as BlockchainType],
        }),
      );
    }
  }

  saveTradeSubscription(
    srcWallet: String,
    tarWallet: string,
    tokenAddress: string,
    tokenAmount: number,
  ) {
    // Create a unique key for this trade request
    const key = `${srcWallet}:${tarWallet}:${tokenAddress}:${tokenAmount}`;
    // Find the client who made this request
    for (const client of this.clients) {
      const sub = this.subscriptions.get(client);
      // You may want to match on more fields if needed
      if (
        sub?.transaction_info &&
        sub.transaction_info.address === tokenAddress
      ) {
        this.tradeSubscriptions.set(key, client);
        break;
      }
    }
  }

  broadcastTradeOccured(tradeResult: any) {
    const {
      sourceWalletAddress,
      targetWalletAddress,
      memeTokenAddress,
      memeTokenAmount,
    } = tradeResult;
    const key = `${sourceWalletAddress}:${targetWalletAddress}:${memeTokenAddress}:${memeTokenAmount}`;
    const client = this.tradeSubscriptions.get(key);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          channel: "trade_result",
          data: tradeResult,
        }),
      );
      this.tradeSubscriptions.delete(key);
    }
  }

  broadcastTokenDetail(tokens: TokenOutput[], trades: TokenTradeCoreType[]) {
    const map = new Map<
      string,
      {
        token: TokenOutput;
        trades: (Omit<TokenTradeCoreType, "wallet"> & {
          wallet: {
            address: string;
            top10holder: false;
            first_buy: false;
          };
        })[];
      }
    >();

    tokens.forEach((token) => {
      map.set(token.address, {
        token: token,
        trades: trades
          .filter((trade) => trade.token === token.address)
          .map((trade) => ({
            ...trade,
            wallet: {
              address: trade.wallet,
              top10holder: false,
              first_buy: false,
            },
          })),
      });
    });

    for (const client of this.clients) {
      const sub = this.subscriptions.get(client);
      if (!sub?.token_detail || client.readyState !== WebSocket.OPEN) continue;

      const data = map.get(sub.token_detail.address);
      if (!data) continue;

      client.send(
        JSON.stringify({
          channel: "token_detail",
          data: data,
          request_id: sub.token_detail.request_id,
        }),
      );
    }
  }

  handleConnection(client: WebSocket) {
    Logger.getInstance().info("WS client connected");
    this.clients.add(client);
    this.subscriptions.set(client, {
      dashboard: false,
      trending: null,
      network: "all",
      watchlist: null,
      transaction_info: null,
      position_info: null,
      limit_info: null,
      token_detail: null,
    });

    client.on("close", () => this.handleDisconnect(client));
    client.on("message", (data) => this.handleMessage(client, data));
  }

  handleDisconnect(client: WebSocket) {
    Logger.getInstance().info("WS client disconnected");
    this.clients.delete(client);
    this.subscriptions.delete(client);
    // Clear transaction subscription if exists
    if (this.transactionSubscriptions.has(client)) {
      const sub = this.transactionSubscriptions.get(client);
      if (typeof sub === "object" && sub && typeof sub.close === "function")
        sub.close();
      this.transactionSubscriptions.delete(client);
    }
    if (this.mainTokenInfoSubscriptions.has(client)) {
      const sub = this.mainTokenInfoSubscriptions.get(client);
      if (typeof sub === "object" && sub && typeof sub.close === "function")
        sub.close();
      this.mainTokenInfoSubscriptions.delete(client);
    }
  }

  private setSubscription<T extends keyof Subscription>(
    client: WebSocket,
    key: T,
    value: Subscription[T],
  ) {
    const prevLock = this.subscriptionLocks.get(client) || Promise.resolve();
    let release: () => void;
    const lock = new Promise<void>((res) => (release = res));
    this.subscriptionLocks.set(
      client,
      prevLock.then(() => lock),
    );
    try {
      const prev = this.subscriptions.get(client) || {
        dashboard: false,
        trending: null,
        network: "all",
        watchlist: null,
        transaction_info: null,
        token_detail: null,
        position_info: null,
        limit_info: null,
      };
      this.subscriptions.set(client, {
        ...prev,
        [key]: value,
      });
    } finally {
      release!();
      if (this.subscriptionLocks.get(client) === lock) {
        this.subscriptionLocks.delete(client);
      }
    }
  }

  private subscribeDashboard(client: WebSocket, msg: any) {
    this.setSubscription(client, "dashboard", true);
    this.setSubscription(
      client,
      "network",
      msg.params?.network?.toLowerCase() ?? "all",
    );
    Logger.getInstance().info("Client subscribed to dashboard");
  }

  private subscribeTrending(client: WebSocket, msg: any) {
    this.setSubscription(client, "trending", {
      network: msg.params?.network?.toLowerCase(),
      category: msg.params?.category,
      unsubscribe: false,
    });
    Logger.getInstance().info("Client subscribed to trending");
  }

  private async subscribeTransactionInfo(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client) || {
      dashboard: false,
      trending: null,
      network: "all",
      transaction_info: null,
      token_detail: null,
      six_hour_token_info: null,
      twelve_hour_token_info: null,
      day_token_info: null,
    };
    this.subscriptions.set(client, {
      ...prev,
      transaction_info: {
        address: msg.params?.address,
        network: msg.params?.network.toLowerCase(),
        request_id: msg.request_id,
        unsubscribe: false,
      },
    });

    if (msg.params?.network && msg.params?.address) {
      await this.addMonitorKeyToRedis(
        msg.params.network.toLowerCase(),
        msg.params.address,
      );
    }

    Logger.getInstance().info("Client subscribed to transaction_info");
  }

  private async subscribeTokenDetail(client: WebSocket, msg: any) {
    console.log(">>>>>> Subscribing to token detail: ", msg.params?.address);

    this.setSubscription(client, "token_detail", {
      address: msg.params?.address,
      network: msg.params?.network.toLowerCase(),
      request_id: msg.request_id,
      unsubscribe: false,
    });
    Logger.getInstance().info("Client subscribed to trending");

    if (msg.params?.network && msg.params?.address) {
      await this.addMonitorKeyToRedis(
        msg.params.network.toLowerCase(),
        msg.params.address,
      );
    }

    Logger.getInstance().info("Client subscribed to token_detail");
  }

  private async subscribePositionInfo(client: WebSocket, msg: any) {
    const walletRepo = this.tokenRepository.manager.getRepository("wallets");
    let walletAddress = null;
    if (msg.params?.network && msg.params?.address) {
      const walletRow = await walletRepo.findOne({
        where: { network: msg.params.network.toLowerCase() },
      });
      if (walletRow && walletRow.address) {
        walletAddress = walletRow.address;
      }
    }

    this.setSubscription(client, "position_info", {
      address: msg.params?.address,
      network: msg.params?.network.toLowerCase(),
      request_id: msg.request_id,
      wallet: walletAddress,
      unsubscribe: false,
    });
    Logger.getInstance().info("Client subscribed to position_info");
  }

  private async subScribeLimitsInfo(client: WebSocket, msg: any) {
    this.setSubscription(client, "limit_info", {
      address: msg.params?.address,
      network: msg.params?.network?.toLowerCase(),
      request_id: msg.request_id,
      user_id: msg.params?.user_id,
      unsubscribe: false,
    });

    Logger.getInstance().info("Client subscribed to limits_info");
  }

  private async subscribeWatchlist(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client) || {
      dashboard: false,
      trending: null,
      network: "all",
      transaction_info: null,
      position_info: null,
      token_detail: null,
      five_min_token_info: null,
      fifteen_min_token_info: null,
      thirty_min_token_info: null,
      one_hour_token_info: null,
      six_hour_token_info: null,
      twelve_hour_token_info: null,
      day_token_info: null,
    };

    this.subscriptions.set(client, {
      ...prev,
      watchlist: {
        network: msg.params?.network.toLowerCase(),
        category: msg.params?.category,
        user_id: msg.params?.user_id,
        unsubscribe: false,
      },
    });
  }

  private async addMonitorKeyToRedis(network: string, address: string) {
    if (!network || !address) return;
    const timestamp = Date.now();
    const redisKey = `keys:${network}:monitoring:${address}-${timestamp}`;
    const exist = await this.redis.keys(
      `keys:${network}:monitoring:${address}-*`,
    );
    if (exist.length === 0) {
      try {
        await this.redis.set(redisKey, "");
      } catch (e) {
        console.error("Error adding monitor key to Redis", e);
      }
    }
  }

  handleMessage(client: WebSocket, data: any) {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "subscribe") {
        switch (msg.channel) {
          case "dashboard":
            this.subscribeDashboard(client, msg);
            break;
          case "trending":
            this.subscribeTrending(client, msg);
            break;
          case "watchlist":
            this.subscribeWatchlist(client, msg);
            break;
          case "transaction_info":
            this.subscribeTransactionInfo(client, msg);
            break;
          case "token_detail":
            this.subscribeTokenDetail(client, msg);
            break;
          case "position_info":
            this.subscribePositionInfo(client, msg);
            break;
          case "limit_info":
            this.subScribeLimitsInfo(client, msg);
            break;
          default:
            break;
        }
      } else {
        switch (msg.channel) {
          case "dashboard":
            this.unsubscribeDashboard(client, msg);
            break;
          case "trending":
            this.unsubscribeTrending(client, msg);
            break;
          case "transaction_info":
            this.unsubscribeTransactionInfo(client, msg);
            break;
          case "token_detail":
            this.unsubscribeTokenDetail(client, msg);
            break;
          case "watchlist":
            this.unsubscribeWatchList(client, msg);
            break;
          case "position_info":
            this.unsubscribePositionInfo(client, msg);
            break;
          case "limit_info":
            this.unsubScribeLimitsInfo(client, msg);
            break;
          default:
            break;
        }
      }
    } catch (e) {
      Logger.getInstance().error(
        "Failed to parse message or handle subscription",
        e,
      );
    }
  }

  private unsubscribeDashboard(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client);
    if (!prev) return;
    this.subscriptions.set(client, { ...prev, dashboard: false });
    Logger.getInstance().info("Client unsubscribed from dashboard");
  }

  private unsubscribeTrending(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client);
    if (!prev) return;
    this.subscriptions.set(client, { ...prev, trending: null });
    Logger.getInstance().info("Client unsubscribed from trending");
  }

  private unsubscribeTransactionInfo(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client);
    if (!prev) return;
    this.subscriptions.set(client, { ...prev, transaction_info: null });
    Logger.getInstance().info("Client unsubscribed from transaction_info");
  }

  private unsubscribeTokenDetail(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client);
    if (!prev) return;
    this.subscriptions.set(client, { ...prev, token_detail: null });
    Logger.getInstance().info("Client unsubscribed from token_detail");
  }

  private unsubscribeWatchList(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client);
    if (!prev) return;
    this.subscriptions.set(client, { ...prev, watchlist: null });
    Logger.getInstance().info("Client unsubscribed from watchlist");
  }

  private unsubscribePositionInfo(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client);
    if (!prev) return;
    this.subscriptions.set(client, { ...prev, position_info: null });
    Logger.getInstance().info("Client unsubscribed from position_info");
  }

  private unsubScribeLimitsInfo(client: WebSocket, msg: any) {
    const prev = this.subscriptions.get(client);
    if (!prev) return;
    this.subscriptions.set(client, { ...prev, limit_info: null });
    Logger.getInstance().info("Client unsubscribed from limit_info");
  }

  /**
   * Broadcast token data to clients for Dashboard
   * @param data - Token data to broadcast
   */
  broadcastTokenMain(data: TokenOutput[]) {
    try {
      const convertedData: DashboardTokenResponse[] = data.map((token) => ({
        network: token.network,
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        uri: token.uri,
        price: token.price,
        mc: token.mc,
        status: token.status as 0 | 1 | 2,
        total_supply: token.total_supply,
        top10holders: token.top10holders,
        degen_audit: token.degen_audit,
        time: token.time,
        vol_1m: token.vol_1m,
        vol_5m: token.vol_5m,
        vol_15m: token.vol_15m,
        vol_30m: token.vol_30m,
        vol_1h: token.vol_1h,
        vol_6h: token.vol_6h,
        vol_12h: token.vol_12h,
        vol_24h: token.vol_24h,
        txs_1h: token.sell_cnt_24h + token.buy_cnt_24h, // txs_1h param showed as 24h trans count in frontend
        price_change_24h: token.price_change_24h,
        cnt_holder: token.cnt_holder,
      }));

      for (const client of this.clients) {
        const sub = this.subscriptions.get(client);
        if (!sub?.dashboard || client.readyState !== WebSocket.OPEN) continue;
        if (sub.network === "all") {
          Logger.getInstance().info("websocket to dashboard");
          client.send(
            JSON.stringify({
              channel: "dashboard",
              data: convertedData,
            }),
          );
          continue;
        }

        const filtered = convertedData.filter(
          (token) => token.network === sub.network,
        );
        if (filtered.length === 0) continue;
        Logger.getInstance().info("websocket to dashboard");
        client.send(
          JSON.stringify({
            channel: "dashboard",
            data: filtered,
          }),
        );
      }
    } catch (error) {
      Logger.getInstance().error("Error broadcasting token data", error);
    }
  }
}
