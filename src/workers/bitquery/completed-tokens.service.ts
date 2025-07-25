import { Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BitQueryService } from "@workers/bitquery/bitquery.service";
import {
  BscCompletedRawType,
  BscCompletedTokenCurrencyInfo,
  BscCompletedTokenHolderInfo,
  BscCompletedTokenRawDetail,
  BscCompletedTokenVolumeInfo,
  SolanaMarketedTokenRawType,
  SolanaTokenCompletingRawType,
  SolanaTokenDetailRawType,
} from "@workers/bitquery/bitquery.types";
import { TokenOutput } from "@rest-api/token.output";
import {
  SOLANA_TOKEN_DETAIL_QUERY,
  SOLANA_TOKEN_COMPLETED_QUERY,
  BSC_NETWORK,
  ETHEREUM_NETWORK,
  SOLANA_NETWORK,
  BSC_TOKEN_COMPLETED_QUERY,
  BSC_TOKEN_DETAIL_QUERY,
  SOLANA_QUERY_BASE_URL,
  BSC_QUERY_BASE_URL,
  BlockchainType,
} from "@common/constants";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import Logger from "@common/logger";
import { TokenSummaryService } from "@databases/token_analyze_summary/token-summary.service";
import { TokenSummaryResponse } from "@databases/token_analyze_summary/types/token-summary-response.type";

@Injectable()
export class CompletedTokensService {
  constructor(
    private readonly bitQueryService: BitQueryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenSummaryService: TokenSummaryService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @OnEvent("token.candidate_list")
  fetchCompletedTokenList(network: string) {
    if (network === SOLANA_NETWORK) return this.fetchSolanaCompletedTokenList();
    if (network === ETHEREUM_NETWORK)
      return this.fetchEthereumCompletedTokenList();
    if (network === BSC_NETWORK) return this.fetchBscCompletedTokenList();
  }

  private async fetchEthereumCompletedTokenList() {}

  private async fetchBscCompletedTokenList() {
    Logger.getInstance().info(
      "[fetchBscCompletedTokenList] Fetching BSC completed tokens...",
    );

    const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const migratedTokens =
      await this.bitQueryService.fetchData<BscCompletedRawType>(
        BSC_TOKEN_COMPLETED_QUERY,
        BSC_QUERY_BASE_URL,
        { fromDate },
      );

    const completingAddressList: string[] = [
      "0x1918713137cba1c1831cd0ff348e65d76eb543f2",
      "0x030663e15a96408ee80b1a215cc1d0dd31494444",
      "0x83cb4aae596bd75337db1d0eebc06e8341d084f6",
      "0x2adb33caa544c7ef908df449fd44b57bd4974444",
      "0x468b66da5bf3fed006eb03e7de7cae50dae6e12b",
      "0xaa22b687e5fb2218fdc7a1cf19e888b4a5954444",
      "0x57f1561db1307322f37c7a4c53a2be9331374444",
      "0x8601d57e883184c13433059e7344b6aa3232f332",
      "0x69f9f66cdd35d72fdd6e2f6ee73c75d5bfbd4444",
      "0x14325a2ac92fc70712560ef776f5b7442d7d71f9",
      "0xf625b131336b4544907e160507aa8d8568104444",
      "0x7a8e4d459816e3002852c17d7b8151c2afc14444",
      "0x0a4f6d90b3f83cc1a8af759e1465388b6e394444",
      "0xe77512c5d4b7324e19ef030c87d4dca0409ae361",
      "0xb07d13b34e8bfb16fcca04bd8b31b232d8e84444",
      "0xdf3a356f140dc98852af7acd5f7c786ebd1a4444",
      "0x98925bc379b33b3a2e752c223b77711be4df4444",
      "0xf663c7b230901ccb7a20a53ec50069eeb6d487fd",
      "0xb8d681a2a89092d16165f8796e697a5747d44444",
      "0x48a435e7caeb002e6e3839721b58029a418d4444",
      "0xef7352f8be5bea10d339a0a9423d592bfa4e77e4",
      "0xc0e2bd64af7d7ab4574883b4aaf4220a351f4444",
      "0xd9a0aa549c1f12fb1d4c9ae6f272a649471be6b4",
      "0xc39e8d71068f27705485882a7a801348d144f287",
      "0x5ecdbee64451469921e9198d0afb03f8ecfdc0b4",
      // "0x96d46762e448ae50e90b718e2a3264e870574444",
      // "0x0cadcf18b651f5310f6f03a4c1fd8eb86e2c6825",
      // "0x5e25069d4930a35967a80eac1602a7427fb94444",
      // "0x68e8b3043309da39409e534ebd9d9955a01ea61e",
      // "0x28ea729cb037eb1e9848a75f67173f49417e4444",
      // "0xf40f7b3ebb2c43dc1a4f17326a8928d2e3c2c3bc",
      // "0xb3b5459e95420c4d916a3780138aa98c99f1b174",
      // "0x6ef7d8bf733e6dcfd047746cd147bf1a1e044444",
      // "0x83a5298f921cc42513f497cd9c4b6194e6e94444",
      // "0xc11f18b45f2815f4f846a5e536019bcb9ab0a6e4",
      // "0xcb3c18964c348bf5bbb9021fba06faa847e3aeb4",
      // "0x9d534c01de1cdd3726c22ca81c72d9aa53dfbcc1",
      // "0xd09c958db1c25556f487d490a06f4f0c2e912165",
      // "0x3e3298b0e6e65bec4a06901bf8e75720cee73959",
      // "0x6479270bb861f1fba6ad2a0af8d3f089d9bcbde0",
      // "0xbe490eca8482d0a0d46f9ad521fb529667dc4662",
      // "0x4e5ce12b009ff7debac689082a65ac1c81753a11",
      // "0x558cc29ebceb141b188bd473a26959838bfc4444",
      // "0x6447398a6edc1de0a27e861c090b204e624a8731",
      // "0x64810a3c95d3328430a71d96b4b9916854c1fd7b",
      // "0x4da2a2826bd60bce380ed20794eee5f9a0e0dfcf",
      // "0x3cd19fc6e04c13cbcf2ae5b52542ac9483070f5f",
      // "0x98c945e91c8eb1fab2d05104a4e092a2011fc3f2",
      // "0x05d005b878a7fc0f95cf5d49832e1e312b55db80",
      // "0x1f7b8d4adec4b0872db349f0f783931faffea9bc",
      // "0x031abbae82cfabaab8da683a05094f3bb1594444",
      // "0x0944d8531a98768db7b37a48c6ba8f2a0de88424",
      // "0x8a5af1f5f5b8455791894e71be04ccdd54ec03dc",
      // "0x3643f331945abda82232e39c2e18ff4543455a00",
      // "0xfea21da35e9137c9dc4e13d2b68d27ddf13edb74",
      // "0xf3a97107a5628ea268628edc8beb57559cbecb20",
      // "0x54a48c60330ffc13ab620c8e88d955fccb5130a4",
      // "0x5c090f94f3e78d236586f87fe8fa3af7d2f412ee",
      // "0x32dea65f0c80d3e14004ba0713c594eb5c994444",
      // "0x4411a286b4f922f65fe2831b42dfe13e91634444",
      // "0xe1a2d5ed5c5e308d6f94673d4b7c330a5fc6ff00",
      // "0x87fa2f96a2fe747183a01f40c7015a727803ecf3",
      // "0x5c8e267c20ce5385ef1363edb37befad90104444",
      // "0xc7889f47e10ab282bfd20a827b69c16deff05b06",
      // "0xbc85eff270d9d66f8665cfbc8271af2d4702af52",
      // "0x4b73ad9bd204c2b8a15b09f48b6d9f9a3f4045c6",
      // "0x35add0f752987d075d576ca77d8f62869b9effb8",
      // "0x7d3692ab431b9a6e906db261e8011bc5c439fbea",
      // "0xa23331db16c738f56d500c2889fa86eb8d87a3cc",
      // "0xf3470a22bd8e95d9babfbbb1b65a5a53fa3a4444",
      // "0x024fddcc404047f2771f1755befab8f7e40f5275",
      // "0x7350f36d4536b2b28a4b2f944ee271e3d131ca54",
      // "0xb5e9ed46e76e0d022696f0279a4e7bd10d3c01d6",
    ];
    const migratedAddressList: string[] = [];

    if (migratedTokens) {
      migratedTokens.EVM.Events.forEach((event) => {
        const address = event.Arguments.find((arg) => arg.Name === "token1")
          ?.Value.address;

        if (address) migratedAddressList.push(address);
      });
    }

    const addressList: string[] = [
      ...completingAddressList,
      ...migratedAddressList,
    ];

    let tokenDetailList: BscCompletedTokenRawDetail;
    try {
      tokenDetailList =
        await this.bitQueryService.fetchData<BscCompletedTokenRawDetail>(
          BSC_TOKEN_DETAIL_QUERY,
          BSC_QUERY_BASE_URL,
          {
            currency: addressList,
          },
        );
    } catch (error) {
      Logger.getInstance().error(
        `[fetchBscCompletedTokenList] Failed fetching bsc token detail list, error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return;
    }

    const infoMap = new Map<string, BscCompletedTokenCurrencyInfo>();
    // const volumeMap = new Map<string, BscCompletedTokenVolumeInfo>();
    // const holderMap = new Map<string, BscCompletedTokenHolderInfo>();

    tokenDetailList.EVM.P.forEach((p) => {
      const currency = p.Trade.Currency;
      infoMap.set(currency.SmartContract, p);
    });

    const completingResult: TokenOutput[] = [];
    const migratedResult: TokenOutput[] = [];

    // Get Summary data for tokens
    const summaryList: TokenSummaryResponse[] =
      await this.tokenSummaryService.getTokensSummary(
        BlockchainType.BSC,
        addressList,
      );

    const summaryMap = new Map<string, TokenSummaryResponse>();

    summaryList.forEach((summary) => {
      summaryMap.set(summary.token, summary);
    });

    // Get token holder counts
    const holderMap = await this.tokenSummaryService.getTokenHoldersCount(
      addressList,
      BlockchainType.BSC,
    );

    addressList.forEach((address) => {
      const info = infoMap.get(address);

      if (!info) {
        return;
      }

      let tokenOutput = new TokenOutput();

      tokenOutput.address = address;
      tokenOutput.name = info.Trade.Currency.Name;
      tokenOutput.symbol = info.Trade.Currency.Symbol;
      tokenOutput.price = +info.Trade.PriceInUSD;
      tokenOutput.uri = "";
      tokenOutput.network = BSC_NETWORK;
      tokenOutput.time = new Date(info.Block.Time).toISOString();
      tokenOutput.mc = +info.Trade.PriceInUSD * 1e9;

      const cnt_holder = holderMap?.get(tokenOutput.address);

      tokenOutput = TokenOutput.assignSummary(
        tokenOutput,
        summaryMap.get(tokenOutput.address),
        cnt_holder ? cnt_holder : 0,
      );

      if (migratedAddressList.includes(address)) {
        tokenOutput.status = 2; // migrated
        migratedResult.push(tokenOutput);
      } else {
        tokenOutput.status = 1; // completing
        completingResult.push(tokenOutput);
      }
    });

    Logger.getInstance().info(
      "[fetchBscCompletedTokenList] Fetching BSC completed tokens successful.",
    );
    Logger.getInstance().info(
      `completing: ${completingResult.length}, migrated: ${migratedResult.length}`,
    );

    this.eventEmitter.emit(
      "token.completed_list",
      [completingResult, migratedResult],
      BSC_NETWORK,
    );
  }

  private async fetchSolanaCompletedTokenList() {
    Logger.getInstance().info(
      "[fetchSolanaCompletedTokenList], fetching tokens...",
    );

    const {
      Solana: { completingTokens, migratedTokens },
    } = await this.bitQueryService.fetchData<SolanaTokenCompletingRawType>(
      SOLANA_TOKEN_COMPLETED_QUERY,
      SOLANA_QUERY_BASE_URL,
      {},
    );

    const addresses: string[] = [
      ...completingTokens.map(
        (token) => token.Pool.Market.BaseCurrency.MintAddress,
      ),
      ...migratedTokens.map(
        (token) => token.Pool.Market.BaseCurrency.MintAddress,
      ),
    ];

    // Get token details
    const {
      Solana: { TokenDetail: tokenDetailList },
    } = await this.bitQueryService.fetchData<SolanaTokenDetailRawType>(
      SOLANA_TOKEN_DETAIL_QUERY,
      SOLANA_QUERY_BASE_URL,
      {
        tokens: addresses,
      },
    );

    const tokenDetailMap = new Map<string, any>();

    // Populate market cap and supply data
    tokenDetailList.forEach((item) => {
      const mintAddress = item.Trade.Currency.MintAddress;
      tokenDetailMap.set(mintAddress, item);
    });

    // Get Summary data for tokens
    const summaryList: TokenSummaryResponse[] =
      await this.tokenSummaryService.getTokensSummary(
        BlockchainType.SOLANA,
        addresses,
      );

    const summaryMap = new Map<string, TokenSummaryResponse>();

    summaryList.forEach((summary) => {
      summaryMap.set(summary.token, summary);
    });

    // Get token holder counts
    const holderMap = await this.tokenSummaryService.getTokenHoldersCount(
      addresses,
      BlockchainType.SOLANA,
    );

    const result: TokenOutput[][] = [
      {
        status: 1,
        tokens: completingTokens,
      },
      {
        status: 2,
        tokens: migratedTokens,
      },
    ].map(({ status, tokens }) => {
      return tokens.map((token) => {
        let tokenOutput = TokenOutput.create({});

        tokenOutput.network = SOLANA_NETWORK;
        tokenOutput.address = token.Pool.Market.BaseCurrency.MintAddress;
        tokenOutput.name = token.Pool.Market.BaseCurrency.Name;
        tokenOutput.symbol = token.Pool.Market.BaseCurrency.Symbol;
        tokenOutput.uri = token.Pool.Market.BaseCurrency.Uri;
        tokenOutput.status = status; // 1 for completing, 2 for migrated

        const tokenDetail = tokenDetailMap.get(tokenOutput.address);
        if (tokenDetail) {
          tokenOutput.price = +tokenDetail.Trade.currentPrice;
          tokenOutput.mc = tokenOutput.price * 1e9;
        }

        const cnt_holder = holderMap?.get(tokenOutput.address);
        tokenOutput = TokenOutput.assignSummary(
          tokenOutput,
          summaryMap.get(tokenOutput.address),
          cnt_holder ? cnt_holder : 0,
        );

        // [TODO-X] holder data

        return tokenOutput;
      });
    });

    Logger.getInstance().info(
      "[fetchSolanaCompletedTokenList], fetching tokens successful.",
    );

    this.eventEmitter.emit("token.completed_list", result, SOLANA_NETWORK);
  }
}
