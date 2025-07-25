import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsNumberString,
  Length,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class CreateWalletDto {
  @ApiProperty({
    description: "User identifier no received from server",
    example: "CfeQe_0h_AXlLpIiXqy9GDgQzR-b86w8ZKlnmWwsG-A",
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  user_id!: string;
}

export class ImportWalletDto {
  @ApiProperty({
    description: "User identifier no received from server",
    example: "CfeQe_0h_AXlLpIiXqy9GDgQzR-b86w8ZKlnmWwsG-A",
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  user_id!: string;

  @ApiProperty({
    description: "Blockchain network",
    example: "eth",
    enum: ["eth", "sol", "bsc"],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["eth", "sol", "bsc"])
  network!: string;

  @ApiProperty({
    description: "Private key to import",
    example: "0x1234567890abcdef...",
  })
  @IsString()
  @IsNotEmpty()
  private!: string;
}

export class TransferDto {
  @ApiProperty({
    description: "Blockchain network for sender",
    example: "eth",
    enum: ["eth", "sol", "bsc"],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["eth", "sol", "bsc"])
  src_network!: string;

  @ApiProperty({
    description: "Sender wallet address",
    example: "0x742d35Cc6634C0532925a3b8D4B9d4E0",
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  src_address!: string;

  @ApiProperty({
    description: "Blockchain network for recipient",
    example: "eth",
    enum: ["eth", "sol", "bsc"],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["eth", "sol", "bsc"])
  dst_network!: string;

  @ApiProperty({
    description: "Recipient wallet address",
    example: "0x742d35Cc6634C0532925a3b8D4B9d4E0",
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  dst_address!: string;

  @ApiProperty({
    description: "Amount to transfer",
    example: "1.5",
  })
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  amount!: string;

  @ApiProperty({
    description: "User password",
    example: "securePassword123",
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class SetDefaultWalletDto {
  @ApiProperty({
    description: "User identifier no received from server",
    example: "CfeQe_0h_AXlLpIiXqy9GDgQzR-b86w8ZKlnmWwsG-A",
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  user_id!: string;

  @ApiProperty({
    description: "Blockchain network",
    example: "eth",
    enum: ["eth", "sol", "bsc"],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["eth", "sol", "bsc"])
  network!: string;

  @ApiProperty({
    description: "Wallet address to set as default",
    example: "0x1234567890abcdef...",
  })
  @IsString()
  @IsNotEmpty()
  wallet_address!: string;
}
