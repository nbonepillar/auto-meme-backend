import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ERROR_CODES } from "../../common/error-codes";

import {
  CreateWalletDto,
  ImportWalletDto,
  TransferDto,
  SetDefaultWalletDto,
} from "@rest-api/wallets/wallets.dto.request";
import {
  CreateWalletResponseDto,
  ImportWalletResponseDto,
  TransferResponseDto,
  SetDefaultWalletResponseDto,
} from "@rest-api/wallets/wallets.dto.response";

import { WalletsService } from "@databases/wallets/wallets.service";
import { TransactionsService } from "@databases/transactions/transactions.service";
import { TokensService } from "@databases/tokens/tokens.service";

import { Wallet } from "@databases/wallets/wallets.entity";

import {
  getISO8601FromTimeStamp,
  generateAddressFromPrivateKey,
} from "@common/utils";
import { sendEthTransaction } from "@common/chain/chain.ethereum";
import {
  sendSolTransaction,
  sendSolTransactionV0,
} from "@common/chain/chain.solana";

import { LiFiCrossChainService } from "@workers/trading/cross-chain/lifi-crosschain.service";
import Logger from "@common/logger";
import { ReferralsService } from "@databases/referrals/referrals.service";

/**
 * Controller for wallet-related endpoints such as wallet info retrieval.
 * Uses mock data for demonstration purposes.
 */
@Controller("wallets")
export class WalletController {
  constructor(
    private readonly referralService: ReferralsService,
    private readonly walletService: WalletsService,
    private readonly transactionService: TransactionsService,
    private readonly tokensService: TokensService,
    private readonly lifiService: LiFiCrossChainService,
  ) {}
  /**
   * Retrieves wallet information for a given user ID (mocked).
   *
   * @param user_id - The user ID to look up wallet info for.
   * @returns Wallet info object or error code if not found.
   */
  @Get("info")
  async getWalletInfo(@Query("user_id") user_id: string) {
    if (!user_id) {
      return {
        error: ERROR_CODES.INVALID_USER_ID.code,
        message: ERROR_CODES.INVALID_USER_ID.text,
      };
    }

    const wallets = await this.walletService.findByUserId(user_id);
    if (wallets === null) {
      return {
        error: ERROR_CODES.NOT_FOUND_WALLET.code,
        message: ERROR_CODES.NOT_FOUND_WALLET.text,
      };
    }
    const wallet_addresses = wallets.map((w: Wallet) => w.address);

    const transactions =
      await this.transactionService.findByWallet(wallet_addresses);

    const token_addresses = transactions.map((t) => t.token);

    const tokenEntities =
      await this.tokensService.findByAddresses(token_addresses);
    const addressToUri = Object.fromEntries(
      tokenEntities.map((t) => [t.address, t.uri]),
    );

    const wallet_info = wallets.map((w: Wallet) => {
      const tokens = transactions
        .filter((t) => t.wallet === w.address)
        .map((t) => ({ address: t.token }));

      const uniqueTokens = Array.from(
        new Set(tokens.map((t) => t.address)),
      ).map((address) => ({
        address,
        uri: addressToUri[address] || null,
      }));

      return {
        address: w.address,
        network: w.network,
        is_default: w.is_default,
        tokens: uniqueTokens,
      };
    });

    const history_info = transactions
      .sort(
        (a, b) =>
          new Date(b.transTime).getTime() - new Date(a.transTime).getTime(),
      )
      .map((t) => ({
        token: t.token,
        uri: addressToUri[t.token] || null,
        network: t.chain,
        price: t.price,
        amount: t.nativeAmount,
        payment_detail: t.tokenAmount,
        trade_type: t.is_buy == true ? "buy" : "sell",
        time: getISO8601FromTimeStamp(t.transTime),
      }));

    const { referral_info } =
      await this.referralService.getReferralInfo(user_id);
    return { wallet_info, history_info, referral_info };
  }

  @Post("create")
  @ApiOperation({
    summary: "Create new wallets",
    description: "Creates new wallets for all supported chains (ETH, BSC, SOL)",
  })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({
    type: CreateWalletResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid user_id",
  })
  async create(
    @Body() createWalletDto: CreateWalletDto,
  ): Promise<CreateWalletResponseDto> {
    try {
      const wallets = await this.walletService.createAllWallet(
        createWalletDto.user_id,
      );

      return {
        success: true,
        data: {
          user_id: createWalletDto.user_id,
          wallets: [
            {
              address: wallets.eth,
              network: "eth",
              is_default: false,
              tokens: [],
            },
            {
              address: wallets.bsc,
              network: "bsc",
              is_default: false,
              tokens: [],
            },
            {
              address: wallets.sol,
              network: "sol",
              is_default: false,
              tokens: [],
            },
          ],
        },
        message: "Wallets created successfully",
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : "Failed to create wallets",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("import")
  @ApiOperation({
    summary: "Import existing wallet",
    description:
      "Imports existing wallet from private key and validates address",
  })
  @ApiBody({ type: ImportWalletDto })
  @ApiResponse({
    type: ImportWalletResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid network or private key",
  })
  async import(@Body() importWalletDto: ImportWalletDto) {
    try {
      let wallet: Wallet = new Wallet();
      wallet.address = generateAddressFromPrivateKey(
        importWalletDto.network,
        importWalletDto.private,
      );
      wallet.is_default = false;
      wallet.network = importWalletDto.network.toLowerCase();
      wallet.user_id = importWalletDto.user_id;
      wallet.private_key = importWalletDto.private;
      await this.walletService.saveWallet(wallet);

      // Return success response
      return {
        success: true,
        data: {
          network: importWalletDto.network.toLowerCase(),
          address: wallet.address,
          is_default: false,
          tokens: [],
        },
        message: "Wallet imported successfully",
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : "Failed to import wallet",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // TODO: DB Define and save the transfer history to db
  @Post("transfer")
  @ApiOperation({
    summary: "Transfer funds",
    description:
      "Transfer funds from wallet to specified address (Include CrossChain)",
  })
  @ApiBody({ type: TransferDto })
  @ApiResponse({
    type: TransferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid parameters",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid password",
  })
  async transfer(@Body() transferDto: TransferDto) {
    try {
      Logger.getInstance().info(
        "transfer request - ",
        JSON.stringify(transferDto),
      );
      const wallet = await this.walletService.findByAddress(
        transferDto.src_address,
        transferDto.src_network,
      );
      if (wallet === null) {
        return {
          success: false,
          message: "Sender's wallet no exist",
        };
      }
      let transactionHash = "";
      if (
        transferDto.src_network.toLowerCase() ===
        transferDto.dst_network.toLowerCase()
      ) {
        // Transfer on same chain
        if (transferDto.src_network === "sol") {
          const result = await sendSolTransactionV0(
            wallet?.private_key,
            transferDto.dst_address,
            parseFloat(transferDto.amount),
          );
          if (result.success === false) {
            return {
              success: false,
              message: result.error,
            };
          }
        } else {
          transactionHash = await sendEthTransaction(
            transferDto.dst_network,
            wallet?.private_key,
            transferDto.dst_address,
            transferDto.amount,
          );
        }
      } else {
        // Transfer on cross chain
        const crossResult = await this.lifiService.executeSwap({
          sourceChain: transferDto.src_network.toUpperCase() as
            | "ETH"
            | "SOL"
            | "BSC",
          sourceTokenAddress: undefined,
          sourceAmount: transferDto.amount,
          sourceWalletAddress: wallet.address,
          sourcePrivateKey: wallet.private_key,
          targetChain: transferDto.dst_network.toUpperCase() as
            | "ETH"
            | "SOL"
            | "BSC",
          targetTokenAddress: undefined,
          targetWalletAddress: transferDto.dst_address,
        });
        if (!crossResult.success) {
          throw new Error(
            crossResult.error || "Cross-chain exchange was failed",
          );
        }

        const crossChainAmount = crossResult.amountOut || "0";
        transactionHash = crossResult.transactionHash ?? "";
        Logger.getInstance().info(
          "CrossChain Transfer Result : ",
          crossChainAmount,
          " - ",
        );
      }

      // Return success response
      return {
        success: true,
        data: {
          src_network: transferDto.src_network.toLowerCase(),
          src_address: transferDto.src_address,
          dst_network: transferDto.dst_network.toLowerCase(),
          dst_address: transferDto.dst_address,
          amount: transferDto.amount,
          transaction_hash: transactionHash,
        },
        message: "Wallet transfer successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }

  @Post("makedefault")
  @ApiOperation({
    summary: "Set the wallet as default for trade",
    description: "Set the wallet as default address for trade",
  })
  @ApiBody({ type: SetDefaultWalletDto })
  @ApiResponse({
    type: SetDefaultWalletResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid network or private key",
  })
  async makedefault(@Body() makeDefaultDto: SetDefaultWalletDto) {
    try {
      const wallet: Wallet | null = await this.walletService.findByAddress(
        makeDefaultDto.wallet_address,
        makeDefaultDto.network,
      );
      if (wallet === undefined || wallet === null) {
        return {
          success: false,
          message: "No exist Wallet.",
        };
      }
      await this.walletService.setDefaultWallet(
        makeDefaultDto.user_id,
        makeDefaultDto.network,
        makeDefaultDto.wallet_address,
      );

      // Return success response
      return {
        success: true,
        message:
          "Wallet set as default successfully. Wallet imported successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Wallet set as default was failed.",
      };
    }
  }
}
