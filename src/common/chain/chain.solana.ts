import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  Commitment,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SendOptions,
} from "@solana/web3.js";
import bs58 from "bs58";
import { BadRequestException } from "@nestjs/common";

// create solana wallet address
export function createSolanaWallet(): {
  privateKey: string;
  walletAddress: string;
} {
  // Generate a new keypair
  const keypair = Keypair.generate();

  // Access the public key (wallet address) and the secret key
  const publicKey = keypair.publicKey.toBase58();
  const secretKey = bs58.encode(keypair.secretKey);
  return {
    privateKey: secretKey,
    walletAddress: publicKey,
  };
}

/**
 * Generate Solana wallet address from private key
 * @param privateKey - Solana private key (base58 string or JSON array)
 * @returns wallet address
 */
export function generateSolanaAddressFromPrivateKey(
  privateKey: string,
): string {
  try {
    let secretKey: Uint8Array;

    // Handle different private key formats
    if (Array.isArray(privateKey)) {
      // JSON array format: [1,2,3,...]
      secretKey = new Uint8Array(privateKey);
    } else if (typeof privateKey === "string") {
      try {
        // Try base58 decode first (Phantom wallet format)
        secretKey = bs58.decode(privateKey);
      } catch {
        try {
          // Try JSON array string format
          const keyArray = JSON.parse(privateKey);
          if (Array.isArray(keyArray)) {
            secretKey = new Uint8Array(keyArray);
          } else {
            throw new Error("Invalid JSON format");
          }
        } catch {
          throw new Error("Invalid Solana private key format");
        }
      }
    } else {
      throw new Error("Private key must be string or array");
    }

    // Validate secret key length (should be 64 bytes)
    if (secretKey.length !== 64) {
      throw new Error("Invalid Solana private key length. Must be 64 bytes.");
    }

    // Create keypair from secret key
    const keypair = Keypair.fromSecretKey(secretKey);

    return keypair.publicKey.toString();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(
      `Failed to generate Solana address: ${message}`,
    );
  }
}

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export async function sendSolTransactionV0(
  privateKey: string,
  to: string,
  amount: number,
): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
  gasUsed?: number;
}> {
  const connection = new Connection(heliusRpcUrl, "confirmed" as Commitment);

  try {
    const payer = Keypair.fromSecretKey(bs58.decode(privateKey));
    const toPubkey = new PublicKey(to);

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");

    const ix: TransactionInstruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: toPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    // 메시지 구성 (v0 트랜잭션)
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([payer]);

    // send and retry
    let signature = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        signature = await connection.sendTransaction(transaction, {
          maxRetries: 3,
          skipPreflight: false,
          preflightCommitment: "confirmed",
        } as SendOptions);
        break;
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) throw err;
        await new Promise((res) => setTimeout(res, 1000 * attempts));
      }
    }

    // wait for result
    const confirmation = (await Promise.race([
      connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed",
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Confirmation timeout")), 30000),
      ),
    ])) as any;

    if (confirmation.value?.err) {
      return {
        success: false,
        error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
      };
    }

    // gas fee
    let gasUsed = 0;
    try {
      const txDetails = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      gasUsed = txDetails?.meta?.fee || 0;
    } catch (err) {
      console.warn("Failed to fetch gas used:", err);
    }

    return { success: true, signature, gasUsed };
  } catch (error: any) {
    console.error("Transaction failed:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

export async function sendSolTransaction(
  privateKey: string,
  to: string,
  amount: number,
) {
  const connection = new Connection(
    process.env.ALCHEMY_RPC_URL ?? "",
    "confirmed",
  );
  try {
    const fromKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    const toPubkey = new PublicKey(to);

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubkey,
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    );

    // set block hash and fee payer
    tx.recentBlockhash = blockhash;
    tx.feePayer = fromKeypair.publicKey;

    // transaction sign and commit
    const signature = await connection.sendTransaction(tx, [fromKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log("Transaction sent. Signature:", signature);
    return signature;
  } catch (error) {
    console.error("Transaction error:", error);
    throw error;
  }
}
