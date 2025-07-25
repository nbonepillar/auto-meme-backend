import { TokenSummaryResponse } from "@databases/token_analyze_summary/types/token-summary-response.type";

export class TokenOutput {
  address = "";
  mc = 0;
  liquidity = 0;
  price = 0;
  network = "";
  time = "";
  name = "";
  symbol = "";
  cnt_sniper = 0;
  cnt_holder = 0;
  total_supply = 0;
  uri = "";
  degen_audit = "";
  status = 0;
  top10holders = 0;
  dev_holds = 0;
  one_h_percent = 0;

  vol_1m = 0;
  vol_5m = 0;
  vol_15m = 0;
  vol_30m = 0;
  vol_1h = 0;
  vol_6h = 0;
  vol_12h = 0;
  vol_24h = 0;

  buy_cnt_1m = 0;
  buy_cnt_5m = 0;
  buy_cnt_15m = 0;
  buy_cnt_30m = 0;
  buy_cnt_1h = 0;
  buy_cnt_6h = 0;
  buy_cnt_12h = 0;
  buy_cnt_24h = 0;

  sell_cnt_1m = 0;
  sell_cnt_5m = 0;
  sell_cnt_15m = 0;
  sell_cnt_30m = 0;
  sell_cnt_1h = 0;
  sell_cnt_6h = 0;
  sell_cnt_12h = 0;
  sell_cnt_24h = 0;

  trader_cnt_1m = 0;
  trader_cnt_5m = 0;
  trader_cnt_15m = 0;
  trader_cnt_30m = 0;
  trader_cnt_1h = 0;
  trader_cnt_6h = 0;
  trader_cnt_12h = 0;
  trader_cnt_24h = 0;

  price_change_1m = 0;
  price_change_5m = 0;
  price_change_15m = 0;
  price_change_30m = 0;
  price_change_1h = 0;
  price_change_6h = 0;
  price_change_12h = 0;
  price_change_24h = 0;

  static create(data: Partial<TokenOutput>): TokenOutput {
    const instance = new TokenOutput();
    Object.assign(instance, data);
    return instance;
  }

  static updateSummaryOnTransaction(
    token: TokenOutput,
    isBuy: boolean, // true: buy, false: sell
    amountInUSD: number,
  ): TokenOutput {
    let nToken = {
      ...token,
      vol_1m: +(token.vol_1m || 0) + amountInUSD,
      vol_5m: +(token.vol_5m || 0) + amountInUSD,
      vol_15m: +(token.vol_15m || 0) + amountInUSD,
      vol_30m: +(token.vol_30m || 0) + amountInUSD,
      vol_1h: +(token.vol_1h || 0) + amountInUSD,
      vol_6h: +(token.vol_6h || 0) + amountInUSD,
      vol_12h: +(token.vol_12h || 0) + amountInUSD,
      vol_24h: +(token.vol_24h || 0) + amountInUSD,

      buy_cnt_1m: isBuy ? token.buy_cnt_1m + 1 : token.buy_cnt_1m,
      buy_cnt_5m: isBuy ? token.buy_cnt_5m + 1 : token.buy_cnt_5m,
      buy_cnt_15m: isBuy ? token.buy_cnt_15m + 1 : token.buy_cnt_15m,
      buy_cnt_30m: isBuy ? token.buy_cnt_30m + 1 : token.buy_cnt_30m,
      buy_cnt_1h: isBuy ? token.buy_cnt_1h + 1 : token.buy_cnt_1h,
      buy_cnt_6h: isBuy ? token.buy_cnt_6h + 1 : token.buy_cnt_6h,
      buy_cnt_12h: isBuy ? token.buy_cnt_12h + 1 : token.buy_cnt_12h,
      buy_cnt_24h: isBuy ? token.buy_cnt_24h + 1 : token.buy_cnt_24h,

      sell_cnt_1m: !isBuy ? token.sell_cnt_1m + 1 : token.sell_cnt_1m,
      sell_cnt_5m: !isBuy ? token.sell_cnt_5m + 1 : token.sell_cnt_5m,
      sell_cnt_15m: !isBuy ? token.sell_cnt_15m + 1 : token.sell_cnt_15m,
      sell_cnt_30m: !isBuy ? token.sell_cnt_30m + 1 : token.sell_cnt_30m,
      sell_cnt_1h: !isBuy ? token.sell_cnt_1h + 1 : token.sell_cnt_1h,
      sell_cnt_6h: !isBuy ? token.sell_cnt_6h + 1 : token.sell_cnt_6h,
      sell_cnt_12h: !isBuy ? token.sell_cnt_12h + 1 : token.sell_cnt_12h,
      sell_cnt_24h: !isBuy ? token.sell_cnt_24h + 1 : token.sell_cnt_24h,

      trader_cnt_1m: token.trader_cnt_1m + 1,
      trader_cnt_5m: token.trader_cnt_5m + 1,
      trader_cnt_15m: token.trader_cnt_15m + 1,
      trader_cnt_30m: token.trader_cnt_30m + 1,
      trader_cnt_1h: token.trader_cnt_1h + 1,
      trader_cnt_6h: token.trader_cnt_6h + 1,
      trader_cnt_12h: token.trader_cnt_12h + 1,
      trader_cnt_24h: token.trader_cnt_24h + 1,

      cnt_holder: isBuy ? token.cnt_holder + 1 : token.cnt_holder,
    };

    nToken.price_change_1m = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_1m,
      nToken.buy_cnt_1m,
    );
    nToken.price_change_5m = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_5m,
      nToken.buy_cnt_5m,
    );
    nToken.price_change_15m = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_15m,
      nToken.buy_cnt_15m,
    );
    nToken.price_change_30m = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_30m,
      nToken.buy_cnt_30m,
    );
    nToken.price_change_1h = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_1h,
      nToken.buy_cnt_1h,
    );
    nToken.price_change_6h = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_6h,
      nToken.buy_cnt_6h,
    );
    nToken.price_change_12h = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_12h,
      nToken.buy_cnt_12h,
    );
    nToken.price_change_24h = priceChangeFromPastVolume(
      nToken.price,
      nToken.mc,
      nToken.sell_cnt_24h,
      nToken.buy_cnt_24h,
    );

    return nToken;
  }

  static assignSummary(
    token: TokenOutput,
    summary: TokenSummaryResponse | undefined,
    cnt_holder: number,
  ): TokenOutput {
    if (!summary) {
      return token;
    }

    return {
      ...token,
      // Volume: sum of buy and sell for each period
      vol_1m: (summary.buy_volume_1min || 0) + (summary.sell_volume_1min || 0),
      vol_5m: (summary.buy_volume_5min || 0) + (summary.sell_volume_5min || 0),
      vol_15m:
        (summary.buy_volume_15min || 0) + (summary.sell_volume_15min || 0),
      vol_30m:
        (summary.buy_volume_30min || 0) + (summary.sell_volume_30min || 0),
      vol_1h:
        (summary.buy_volume_1hour || 0) + (summary.sell_volume_1hour || 0),
      vol_6h:
        (summary.buy_volume_6hour || 0) + (summary.sell_volume_6hour || 0),
      vol_12h:
        (summary.buy_volume_12hour || 0) + (summary.sell_volume_12hour || 0),
      vol_24h:
        (summary.buy_volume_24hour || 0) + (summary.sell_volume_24hour || 0),

      // Buy counts
      buy_cnt_1m: summary.buy_count_1min || 0,
      buy_cnt_5m: summary.buy_count_5min || 0,
      buy_cnt_15m: summary.buy_count_15min || 0,
      buy_cnt_30m: summary.buy_count_30min || 0,
      buy_cnt_1h: summary.buy_count_1hour || 0,
      buy_cnt_6h: summary.buy_count_6hour || 0,
      buy_cnt_12h: summary.buy_count_12hour || 0,
      buy_cnt_24h: summary.buy_count_24hour || 0,

      // Sell counts
      sell_cnt_1m: summary.sell_count_1min || 0,
      sell_cnt_5m: summary.sell_count_5min || 0,
      sell_cnt_15m: summary.sell_count_15min || 0,
      sell_cnt_30m: summary.sell_count_30min || 0,
      sell_cnt_1h: summary.sell_count_1hour || 0,
      sell_cnt_6h: summary.sell_count_6hour || 0,
      sell_cnt_12h: summary.sell_count_12hour || 0,
      sell_cnt_24h: summary.sell_count_24hour || 0,

      // Trader counts
      trader_cnt_1m: summary.traders_count_1min || 0,
      trader_cnt_5m: summary.traders_count_5min || 0,
      trader_cnt_15m: summary.traders_count_15min || 0,
      trader_cnt_30m: summary.traders_count_30min || 0,
      trader_cnt_1h: summary.traders_count_1hour || 0,
      trader_cnt_6h: summary.traders_count_6hour || 0,
      trader_cnt_12h: summary.traders_count_12hour || 0,
      trader_cnt_24h: summary.traders_count_24hour || 0,

      // Price changes
      price_change_1m: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_1min,
        summary.buy_volume_1min,
      ),
      price_change_5m: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_5min,
        summary.buy_volume_5min,
      ),
      price_change_15m: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_15min,
        summary.buy_volume_15min,
      ),
      price_change_30m: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_30min,
        summary.buy_volume_30min,
      ),
      price_change_1h: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_1hour,
        summary.buy_volume_1hour,
      ),
      price_change_6h: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_6hour,
        summary.buy_volume_6hour,
      ),
      price_change_12h: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_12hour,
        summary.buy_volume_12hour,
      ),
      price_change_24h: priceChangeFromPastVolume(
        token.price,
        token.mc,
        summary.sell_volume_24hour,
        summary.buy_volume_24hour,
      ),

      cnt_holder: +cnt_holder || 0,
    };
  }
}

function priceChangeFromPastVolume(
  price: number,
  mc: number,
  sell_vol: number,
  buy_vol: number,
): number {
  if (!mc) mc = price * 1e9;

  const active_volume = (sell_vol || 0) + (buy_vol || 0);
  const past_mc = mc - active_volume;

  if (past_mc <= 0) {
    return 0; // Avoid division by zero
  }

  return (active_volume * 100.0) / past_mc;
}
