import { ApiProperty } from "@nestjs/swagger";

export class DashboardTokenResponse {
  @ApiProperty({ description: "Blockchain network identifier" })
  network: string = "";

  @ApiProperty({ description: "Token symbol" })
  symbol: string = "";

  @ApiProperty({ description: "Token name" })
  name: string = "";

  @ApiProperty({ description: "Token contract address" })
  address: string = "";

  @ApiProperty({ description: "Token metadata URI" })
  uri: string = "";

  @ApiProperty({ description: "Current token price" })
  price: number = 0;

  @ApiProperty({ description: "Market capitalization" })
  mc: number = 0;

  @ApiProperty({
    description: "Token status",
    enum: [0, 1, 2],
    example: 1,
  })
  status: 0 | 1 | 2 = 0;

  @ApiProperty({ description: "Total token supply" })
  total_supply: number = 0;

  @ApiProperty({ description: "Top 10 holders percentage" })
  top10holders: number = 0;

  @ApiProperty({ description: "Degen audit result" })
  degen_audit: string = "";

  @ApiProperty({ description: "Token creation time" })
  time: string = "";

  @ApiProperty({ description: "1 minute trading volume" })
  vol_1m: number = 0;

  @ApiProperty({ description: "5 minutes trading volume" })
  vol_5m: number = 0;

  @ApiProperty({ description: "15 minutes trading volume" })
  vol_15m: number = 0;

  @ApiProperty({ description: "30 minutes trading volume" })
  vol_30m: number = 0;

  @ApiProperty({ description: "1 hour trading volume" })
  vol_1h: number = 0;

  @ApiProperty({ description: "6 hours trading volume" })
  vol_6h: number = 0;

  @ApiProperty({ description: "12 hours trading volume" })
  vol_12h: number = 0;

  @ApiProperty({ description: "24 hours trading volume" })
  vol_24h: number = 0;

  @ApiProperty({ description: "24 hours transaction count" })
  txs_1h: number = 0;

  @ApiProperty({ description: "24 hours price change percentage" })
  price_change_24h: number = 0;

  @ApiProperty({ description: "Number of holders" })
  cnt_holder: number = 0;
}
