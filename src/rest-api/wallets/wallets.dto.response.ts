import { ApiProperty } from "@nestjs/swagger";

class WalletAddresses {
  @ApiProperty({ example: "0x742d35Cc6634C0532925a3b8D4B9d4E0" })
  address!: string;

  @ApiProperty({ example: "eth" })
  network!: string;

  @ApiProperty({ example: "false" })
  is_default!: boolean;

  @ApiProperty({})
  tokens!: [];
}

export class CreateWalletResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    type: () => ({
      user_id: { type: "string", example: "user123" },
      wallets: WalletAddresses,
    }),
  })
  data!: {
    user_id: string;
    wallets: WalletAddresses[];
  };

  @ApiProperty({ example: "Wallets created successfully" })
  message!: string;
}

export class ImportWalletResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    type: () => ({
      network: { type: "string", example: "eth" },
      address: {
        type: "string",
        example: "0x742d35Cc6634C0532925a3b8D4B9d4E0",
      },
      is_default: { type: "boolean", example: "false" },
      tokens: { type: "[]", example: "empty array" },
    }),
  })
  data!: {
    wallets: WalletAddresses;
  };

  @ApiProperty({ example: "Wallet imported successfully" })
  message!: string;
}

export class TransferResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    type: () => ({
      src_network: { type: "string", example: "eth" },
      src_address: {
        type: "string",
        example: "0x742d35Cc6634C0532925a3b8D4B9d4E0",
      },
      dst_network: { type: "string", example: "bsc" },
      dst_address: {
        type: "string",
        example: "0x742d35Cc6634C0532925a3b8D4B9d4E0",
      },
      amount: { type: "number", example: "1.5" },
      transaction_hash: { type: "string", example: "0xabc123..." },
    }),
  })
  data!: {
    src_network: string;
    src_address: string;
    dst_network: string;
    dst_address: string;
    amount: string;
    transaction_hash: string;
  };

  @ApiProperty({ example: "Transfer success" })
  message!: string;
}

export class SetDefaultWalletResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: "Wallet imported successfully" })
  message!: string;
}
