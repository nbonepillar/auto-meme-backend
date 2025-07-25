import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { SolanaTokenSummary } from "./entities/solana-token-summary.entity";
import { EthereumTokenSummary } from "./entities/ethereum-token-summary.entity";
import { BSCTokenSummary } from "./entities/bsc-token-summary.entity";
import { TokenSummaryResponse } from "./types/token-summary-response.type";
import { BlockchainType } from "@common/constants";
import { TokenHolders } from "@databases/token_holders/token_holders.entity";
import { TokenTrending } from "./entities/token-trending.entity";
import { DashboardTokenResponse } from "@rest-api/tokens/types/dashboard-token-response.output";

@Injectable()
export class TokenSummaryService {
  private readonly logger = new Logger(TokenSummaryService.name);

  // private trendingTokenStore: Map<string,

  constructor(
    @InjectRepository(SolanaTokenSummary)
    private solanaRepo: Repository<SolanaTokenSummary>,

    @InjectRepository(EthereumTokenSummary)
    private ethereumRepo: Repository<EthereumTokenSummary>,

    @InjectRepository(BSCTokenSummary)
    private bscRepo: Repository<BSCTokenSummary>,

    @InjectRepository(TokenHolders)
    private tokenHoldersRepo: Repository<TokenHolders>,

    @InjectRepository(TokenTrending)
    private tokenTrendingRepo: Repository<TokenTrending>,
  ) {}

  private getRepository(blockchain: BlockchainType) {
    const repoMap = {
      [BlockchainType.SOLANA]: this.solanaRepo,
      [BlockchainType.ETHEREUM]: this.ethereumRepo,
      [BlockchainType.BSC]: this.bscRepo,
    };

    const repository = repoMap[blockchain];
    if (!repository) {
      throw new Error(`Unsupported blockchain: ${blockchain}`);
    }

    return repository;
  }

  public async getTokensSummary(
    blockchain: BlockchainType,
    tokenAddresses: string[],
  ): Promise<TokenSummaryResponse[]> {
    if (tokenAddresses.length === 0) {
      return [];
    }

    try {
      const repository = this.getRepository(blockchain);

      const result: TokenSummaryResponse[] = await repository.find({
        where: { token: In(tokenAddresses) },
        order: { token: "ASC" },
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching token summaries for [${blockchain}]: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return [];
    }
  }

  public async getTokenHolderOfToken(
    address: string,
    limit: number = 20,
  ): Promise<TokenHolders[]> {
    if (address.length === 0) return [];

    const query = `
      SELECT * 
      FROM public.token_holders 
      WHERE token = %1
      ORDER BY balance DESC LIMIT %2
    `;

    let list: TokenHolders[] = [];

    try {
      list = await this.tokenHoldersRepo.find({
        where: { token: address },
        order: { balance: "DESC" },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching token holders of a token: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return list;
  }

  public async getTokenHoldersCount(
    tokenAddress: string[],
    blockchain?: string,
  ): Promise<Map<string, number>> {
    if (!tokenAddress.length) {
      throw new Error("Token address is required");
    }
    const query = `
      SELECT 
        token,
        COUNT(DISTINCT wallet) AS holder_cnt
      FROM token_holders 
      WHERE  
        token = ANY($1)
        ${blockchain ? "AND chain = $2" : ""}
        AND balance >= 1
      GROUP BY token;
    `;
    const holderMap = new Map<string, number>();

    try {
      const params = blockchain ? [tokenAddress, blockchain] : [tokenAddress];
      const result = await this.tokenHoldersRepo.query(query, params);

      result.forEach((item: { token: string; holder_cnt: number }) => {
        holderMap.set(item.token, item.holder_cnt);
      });
    } catch (error) {
      this.logger.error(
        `Error fetching token holders count for [${blockchain}]: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
    return holderMap;
  }

  public async getTrendingList(
    network: "all" | BlockchainType = "all",
  ): Promise<DashboardTokenResponse[]> {
    let result: DashboardTokenResponse[] = [];
    let holderCntMap: Map<string, number> = new Map<string, number>();

    try {
      let rawResult;
      let query;
      if (network !== "all") {
        query = `SELECT * FROM public.trending_tokens
            WHERE chain = '${network}'
            ORDER BY status ASC, buy_volume + sell_volume DESC`;
      } else {
        query = `
          (select * from public.trending_tokens
          WHERE status = 0
          order by buy_volume + sell_volume DESC
          LIMIT 20)
          UNION ALL
          (select * from public.trending_tokens
          WHERE status = 1
          order by buy_volume + sell_volume DESC
          LIMIT 20)
          UNION ALL
          (select * from public.trending_tokens
          WHERE status = 2
          order by buy_volume + sell_volume DESC
          LIMIT 20)
        `;
      }
      rawResult = await this.tokenTrendingRepo.query(query);
      if (rawResult.length > 0) {
        holderCntMap = await this.getTokenHoldersCount(
          rawResult.map((r: TokenTrending) => r.token),
        );
      }

      result = rawResult.map((token: TokenTrending): DashboardTokenResponse => {
        const buyVolume = +(token?.buy_volume ?? 0);
        const sellVolume = +(token?.sell_volume ?? 0);
        const price = +(token?.price ?? 0);
        const mc = +(token?.price ?? 0) * 1e9;

        const volChange = buyVolume - sellVolume;
        const priceChange = (volChange / (mc - volChange)) * 100.0;

        return {
          network: token.chain,
          symbol: token.symbol ?? "",
          name: token.name ?? "",
          address: token.token ?? "",
          uri: token.uri ?? "",
          degen_audit: "",
          time: token.created_at
            ? new Date(+token.created_at).toISOString()
            : new Date().toISOString(),
          price,
          mc,
          status: token.status,
          total_supply: 1e9,
          top10holders: 0,
          vol_1m: 0,
          vol_5m: 0,
          vol_15m: 0,
          vol_30m: 0,
          vol_1h: 0,
          vol_6h: 0,
          vol_12h: 0,
          vol_24h: buyVolume + sellVolume,
          txs_1h: +token.txs,
          price_change_24h: priceChange,
          cnt_holder: +(holderCntMap.get(token.token) ?? 0),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error getting trending token list: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return result;
  }
}
