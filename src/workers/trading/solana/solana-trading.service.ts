import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Connection,
  Keypair,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";

export interface SolanaTradingParams {
  walletAddress: string;
  privateKey: string; // Consider using a secure key management system
  action: "buy" | "sell";
  tokenAddress: string; // Token contract address
  amount: number; // Amount in lamports or tokens
  denominatedInSol: boolean;
  slippage: number; // Percentage (1-50)
  priorityFee?: number; // Optional priority fee in SOL
  pool?: "pump" | "raydium" | "auto"; // Trading pool
}

export interface SolanaTradeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  explorerUrl?: string;
  gasUsed?: number;
  amountIn?: string;
  amountOut?: string;
}

const HELIUS_API_KEY: string =
  process.env.HELIUS_API_KEY || "0265df0d-4e96-48c9-9e8d-052784d44a81";

@Injectable()
export class SolanaTradingService {
  private readonly logger = new Logger(SolanaTradingService.name);
  private readonly connection: Connection;
  private readonly pumpPortalApiUrl = "https://pumpportal.fun/api/trade-local";

  constructor() {
    // Initialize Helius RPC connection
    const heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    this.connection = new Connection(heliusRpcUrl, "confirmed");
    this.logger.log("Solana Trading Service initialized with Helius RPC");
  }

  /**
   * Execute a trade on Pump.fun using PumpPortal Local Transaction API
   * This is the main method that should be called from other services
   */
  async executeTrade(params: SolanaTradingParams): Promise<SolanaTradeResult> {
    try {
      this.logger.log(
        `Executing ${params.action} trade for token ${params.tokenAddress} with amount ${params.amount}`,
      );

      // Validate input parameters
      const validationError = this.validateTradeParams(params);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Get initial balances for comparison
      const initialBalances = await this.getWalletBalances(
        params.walletAddress,
        params.tokenAddress,
      );

      if (initialBalances.sol < 0.001) {
        return {
          success: false,
          error: "Failed to send transaction, low sol balance",
        };
      }

      if (
        params.action === "buy" &&
        initialBalances.sol < params.amount + 0.003
      ) {
        return {
          success: false,
          error: "Failed to send transaction, insufficient sol balance",
        };
      } else if (
        params.action === "sell" &&
        initialBalances.token < params.amount
      ) {
        return {
          success: false,
          error: "Failed to send transaction, insufficient token balance",
        };
      }

      // Step 1: Generate transaction using PumpPortal API
      const transaction = await this.generateTransaction(params);
      if (!transaction) {
        return {
          success: false,
          error: "Failed to send transaction",
        };
      }

      // Step 2: Sign and send transaction
      const result = await this.signAndSendTransaction(
        transaction,
        params.privateKey,
      );

      if (result.success && result.signature) {
        // Get final balances
        const finalBalances = await this.getWalletBalances(
          params.walletAddress,
          params.tokenAddress,
        );

        const explorerUrl = `https://solscan.io/tx/${result.signature}`;
        this.logger.log(`Trade successful. Signature: ${result.signature}`);

        return {
          success: true,
          transactionHash: result.signature,
          explorerUrl,
          gasUsed: result.gasUsed,
          amountIn: params.amount.toString(),
          amountOut: finalBalances.token.toString(),
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to send transaction",
        };
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Trade execution failed: ${errorMessage}`, errorStack);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate transaction using PumpPortal Local Transaction API
   */
  private async generateTransaction(
    params: SolanaTradingParams,
  ): Promise<VersionedTransaction | null> {
    try {
      const requestBody = {
        publicKey: params.walletAddress,
        action: params.action,
        mint: params.tokenAddress,
        amount: params.amount,
        denominatedInSol: params.denominatedInSol.toString(),
        slippage: params.slippage,
        priorityFee: params.priorityFee || 0.001, // Default priority fee
        pool: params.pool || "auto",
      };

      this.logger.debug(
        `PumpPortal request: ${JSON.stringify(requestBody, null, 2)}`,
      );

      const response = await fetch(this.pumpPortalApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status !== 200) {
        const errorText = await response.text();
        this.logger.error(
          `PumpPortal API error: ${response.status} - ${response.statusText} - ${errorText}`,
        );
        return null;
      }

      // Get the serialized transaction
      const data = await response.arrayBuffer();
      const transaction = VersionedTransaction.deserialize(
        new Uint8Array(data),
      );

      this.logger.debug("Transaction generated successfully from PumpPortal");
      return transaction;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to generate transaction: ${errorMessage}`,
        errorStack,
      );
      return null;
    }
  }

  /**
   * Sign and send the transaction to Solana network
   */
  private async signAndSendTransaction(
    transaction: VersionedTransaction,
    privateKey: string,
  ): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
    gasUsed?: number;
  }> {
    try {
      // Create keypair from private key
      const signerKeyPair = Keypair.fromSecretKey(bs58.decode(privateKey));

      // Sign the transaction
      transaction.sign([signerKeyPair]);

      // Send the transaction with retry logic
      let signature: string = "";
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          signature = await this.connection.sendTransaction(transaction, {
            maxRetries: 3,
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
          break;
        } catch (sendError: unknown) {
          attempts++;
          const errorMessage =
            sendError instanceof Error
              ? sendError.message
              : "Unknown error occurred";
          this.logger.warn(
            `Transaction send attempt ${attempts} failed: ${errorMessage}`,
          );

          if (attempts >= maxAttempts) {
            throw sendError;
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }

      this.logger.log(`Transaction sent with signature: ${signature}`);

      // Wait for confirmation with timeout
      const confirmationResult = (await Promise.race([
        this.connection.confirmTransaction(signature, "confirmed"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Confirmation timeout")), 30000),
        ),
      ])) as any;

      if (confirmationResult.value?.err) {
        return {
          success: false,
          error: `Transaction failed: ${JSON.stringify(confirmationResult.value.err)}`,
        };
      }

      // Get transaction details for gas calculation
      let gasUsed = 0;
      try {
        const txDetails = await this.connection.getTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });

        if (txDetails?.meta?.fee) {
          gasUsed = txDetails.meta.fee;
        }
      } catch (gasError) {
        const errorMessage =
          gasError instanceof Error
            ? gasError.message
            : "Unknown error occurred";
        this.logger.warn(`Could not retrieve gas information: ${errorMessage}`);
      }

      return { success: true, signature, gasUsed };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to sign/send transaction: ${errorMessage}`,
        errorStack,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get wallet balances (SOL and specific token)
   */
  private async getWalletBalances(
    publicKey: string,
    mint: string,
  ): Promise<{ sol: number; token: number }> {
    try {
      const [solBalance, tokenBalance] = await Promise.all([
        this.getWalletSolBalance(publicKey),
        this.getWalletTokenBalance(publicKey, mint),
      ]);

      return { sol: solBalance, token: tokenBalance };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.logger.warn(`Failed to get wallet balances: ${errorMessage}`);
      return { sol: 0, token: 0 };
    }
  }

  /**
   * Get wallet's SOL balance
   */
  private async getWalletSolBalance(publicKey: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(
        new PublicKey(publicKey),
      );
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.logger.error(`Failed to get SOL balance: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Get wallet's token balance for specific mint
   */
  private async getWalletTokenBalance(
    publicKey: string,
    mint: string,
  ): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(publicKey),
        { mint: new PublicKey(mint) },
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance =
        tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.logger.error(`Failed to get token balance: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Validate trading parameters
   */
  private validateTradeParams(params: SolanaTradingParams): string | null {
    if (!params.walletAddress || !params.privateKey) {
      return "Public key and private key are required";
    }

    if (!params.tokenAddress) {
      return "Token mint address is required";
    }

    if (params.amount <= 0) {
      return "Amount must be greater than 0";
    }

    if (params.slippage < 0.1 || params.slippage > 50) {
      return "Slippage must be between 0.1% and 50%";
    }

    if (!["buy", "sell"].includes(params.action)) {
      return 'Action must be either "buy" or "sell"';
    }

    try {
      new PublicKey(params.walletAddress);
      bs58.decode(params.privateKey); // Validate private key format
    } catch (error) {
      return "Invalid public key, mint address, or private key format";
    }

    return null;
  }

  /**
   * Helper method to check if service is properly initialized
   */
  async healthCheck(): Promise<{
    status: string;
    rpcConnected: boolean;
    latency?: number;
  }> {
    try {
      const startTime = Date.now();
      await this.connection.getSlot();
      const latency = Date.now() - startTime;

      return {
        status: "healthy",
        rpcConnected: true,
        latency,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        rpcConnected: false,
      };
    }
  }
}
