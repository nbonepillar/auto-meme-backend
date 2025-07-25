import { Entity, Column, PrimaryColumn } from "typeorm";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseFloat(value),
};

const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseInt(value, 10),
};

@Entity("bsc_token_volume_complete_summary", {
  synchronize: false,
})
export class BSCTokenSummary {
  @PrimaryColumn()
  token!: string;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_1min!: number;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_5min!: number;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_15min!: number;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_30min!: number;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_1hour!: number;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_6hour!: number;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_12hour!: number;

  @Column("numeric", { transformer: numericTransformer })
  buy_volume_24hour!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_1min!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_5min!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_15min!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_30min!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_1hour!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_6hour!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_12hour!: number;

  @Column("numeric", { transformer: numericTransformer })
  sell_volume_24hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_1min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_5min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_15min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_30min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_1hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_6hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_12hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  buy_count_24hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_1min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_5min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_15min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_30min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_1hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_6hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_12hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  sell_count_24hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_1min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_5min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_15min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_30min!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_1hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_6hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_12hour!: number;

  @Column("bigint", { transformer: bigintTransformer })
  traders_count_24hour!: number;
}
