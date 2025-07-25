import { Controller, Get, Query } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Tokens } from "../../databases/tokens/tokens.entity";
import { Transaction } from "../../databases/transactions/transactions.entity";
import { TokenPriceHistory } from "../../databases/token_price_history/token_price_history.entity";
import { TokenHolders } from "../../databases/token_holders/token_holders.entity";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { getISO8601FromTimeStamp } from "../../common/utils";
import { TokenOutput } from "@rest-api/token.output";
import { TokenSummaryService } from "@databases/token_analyze_summary/token-summary.service";

/**
 * Controller for providing detailed information about a specific token.
 * Uses mock data for demonstration purposes.
 */
@Controller("tokens")
export class TokenDetailController {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(Tokens)
    private readonly tokenRepository: Repository<Tokens>,
    @InjectRepository(TokenPriceHistory)
    private readonly priceHistoryRepository: Repository<TokenPriceHistory>,
    @InjectRepository(TokenHolders)
    private readonly holdersRepository: Repository<TokenHolders>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private tokenSummaryService: TokenSummaryService,
  ) {}

  /**
   * Returns detailed information for a token by address.
   *
   * @param address - The address of the token to retrieve details for.
   * @returns Token detail data or error code if not found.
   */
  @Get("detail")
  async getTokenDetail(
    @Query("network") network: string,
    @Query("address") address: string,
    @Query("user_id") user_id: string,
  ) {
    // 1. Get current token info
    const redisKey = `datas:${network.toLowerCase()}:${address}`;
    let current_info: TokenOutput | {};
    const cachedJson = await this.redis.get(redisKey);
    if (cachedJson) {
      try {
        current_info = JSON.parse(cachedJson);
      } catch {
        current_info = {};
      }
    } else {
      current_info = { error: "NOT_FOUND_TOKEN" };
    }

    // 2. Get price chart (last 60 points, 1h interval or all available)
    const price_chart = (
      await this.priceHistoryRepository.find({
        where: { token_address: address },
        order: { timestamp: "DESC" },
        take: 60,
      })
    )
      .map((p) => ({
        timestamp: p.timestamp,
        open: p.price, // You may want to adjust open/high/low/close logic
        high: p.price,
        low: p.price,
        close: p.price,
        volume: 0, // Placeholder, update if you have volume data
      }))
      .reverse();

    // 3. Get recent transactions (last 20, placeholder structure)
    // TODO: Replace with actual transaction query if available
    const recent_transactions_raw = await this.transactionsRepository.find({
      where: { token: address },
      order: { transTime: "DESC" },
      take: 50,
    });

    const recent_transactions = recent_transactions_raw.map((tx) => ({
      time: getISO8601FromTimeStamp(tx.transTime),
      type: tx.is_buy,
      tx: tx.txHash,
      total_usd: Number(tx.price) * Number(tx.tokenAmount),
      amount: Number(tx.tokenAmount),
      price: Number(tx.price),
      wallet: {
        wallet_address: tx.wallet,
        top10holder: false,
        first_buy: false,
      },
    }));

    const holders =
      await this.tokenSummaryService.getTokenHolderOfToken(address);

    const holder_list = holders.map((holder) => ({
      address: holder.wallet,
      ownedAmount: holder.balance,
    }));

    // 5. Position Info
    let position_info: any[] = [];
    if (network.toLowerCase() && address && user_id) {
      const walletRepo = this.tokenRepository.manager.getRepository("wallets");
      const userWallets = await walletRepo.find({
        where: { user_id, network: network.toLowerCase() },
      });
      const walletAddresses = userWallets.map((w) => w.address);

      if (walletAddresses.length > 0) {
        const walletTxs = await this.transactionsRepository.find({
          where: {
            wallet: In(walletAddresses),
            token: address,
          },
          order: { transTime: "DESC" },
        });
        position_info = walletTxs.map((tx) => ({
          time: getISO8601FromTimeStamp(tx.transTime),
          type: tx.is_buy === true ? "buy" : "sell",
          total_usd: Number(tx.price) * Number(tx.tokenAmount),
          amount: Number(tx.tokenAmount),
          price: Number(tx.price),
          wallet: {
            wallet_address: tx.wallet,
            top10holder: false,
            first_buy: false,
          },
        }));
      }
    }

    // 6. Limits Info
    let limit_info: any[] = [];
    if (network.toLowerCase() && address && user_id) {
      const walletRepo = this.tokenRepository.manager.getRepository("wallets");
      const userWallets = await walletRepo.find({ where: { user_id } });
      const walletAddresses = userWallets.map((w) => w.address);

      if (walletAddresses.length > 0) {
        const limitsRepo = this.tokenRepository.manager.getRepository("limits");
        const pendingOrders = await limitsRepo.find({
          where: {
            wallet_address: In(walletAddresses),
            token_address: address,
          },
          order: { timestamp: "DESC" },
        });

        limit_info = pendingOrders.map((order) => ({
          limitId: order.id,
          wallet: order.wallet_address,
          type: order.action ?? "buy",
          token: order.token_address,
          network: order.network,
          amount: Number(order.amount_in ?? 0),
          order_price: Number(order.order_price ?? 0),
          limit_type: order.order_type,
          created: getISO8601FromTimeStamp(order.timestamp ?? order.created_at),
          status: order.status ?? "waiting",
        }));
      }
    }

    return {
      price_chart,
      recent_transactions,
      holder_list,
      current_info,
      position_info,
      limit_info,
    };
  }
}
