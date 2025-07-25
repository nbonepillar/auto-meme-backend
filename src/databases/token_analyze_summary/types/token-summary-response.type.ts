export interface TokenSummaryResponse {
  token: string;

  buy_volume_1min: number;
  buy_volume_5min: number;
  buy_volume_15min: number;
  buy_volume_30min: number;
  buy_volume_1hour: number;
  buy_volume_6hour: number;
  buy_volume_12hour: number;
  buy_volume_24hour: number;

  sell_volume_1min: number;
  sell_volume_5min: number;
  sell_volume_15min: number;
  sell_volume_30min: number;
  sell_volume_1hour: number;
  sell_volume_6hour: number;
  sell_volume_12hour: number;
  sell_volume_24hour: number;

  buy_count_1min: number;
  buy_count_5min: number;
  buy_count_15min: number;
  buy_count_30min: number;
  buy_count_1hour: number;
  buy_count_6hour: number;
  buy_count_12hour: number;
  buy_count_24hour: number;

  sell_count_1min: number;
  sell_count_5min: number;
  sell_count_15min: number;
  sell_count_30min: number;
  sell_count_1hour: number;
  sell_count_6hour: number;
  sell_count_12hour: number;
  sell_count_24hour: number;

  traders_count_1min: number;
  traders_count_5min: number;
  traders_count_15min: number;
  traders_count_30min: number;
  traders_count_1hour: number;
  traders_count_6hour: number;
  traders_count_12hour: number;
  traders_count_24hour: number;
}
