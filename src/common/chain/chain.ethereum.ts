import { Wallet, ethers } from "ethers";
import crypto from "crypto";
import { BadRequestException } from "@nestjs/common";

// create evm wallet address
export function createEvmWallet(): {
  privateKey: string;
  walletAddress: string;
} {
  // 1. Generate a random 32-byte hexadecimal string
  const id = crypto.randomBytes(32).toString("hex");
  const privateKey = "0x" + id;

  // 2. Create a Wallet instance from the private key
  const wallet = new Wallet(privateKey);

  return {
    privateKey,
    walletAddress: wallet.address,
  };
}

/**
 * Generate ETH wallet address from private key
 * @param privateKey - ETH private key (with or without 0x prefix)
 * @returns wallet address
 */
export function generateEthAddressFromPrivateKey(privateKey: string): string {
  try {
    // Ensure private key has 0x prefix
    if (!privateKey.startsWith("0x")) {
      privateKey = "0x" + privateKey;
    }

    // Validate private key format (64 hex characters + 0x)
    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
      throw new Error(
        "Invalid ETH private key format. Must be 64 hex characters.",
      );
    }
    // Use ethers to get address
    const wallet = new Wallet(privateKey);
    return wallet.address;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`Failed to generate ETH address: ${message}`);
  }
}

export async function sendEthTransaction(
  network: string,
  privateKey: string,
  to: string,
  amount: string,
) {
  let provider = null;
  if (network.toLowerCase() === "eth") {
    provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL,
    );
  } else if (network.toLowerCase() === "bsc") {
    provider = new ethers.providers.JsonRpcProvider(
      process.env.BINANCE_RPC_URL,
    );
  } else if (network.toLowerCase() === "sepolia") {
    provider = new ethers.providers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL,
    );
  }
  if (provider === null) {
    throw new BadRequestException(`Not support chain : ${network}`);
  }
  const wallet = new ethers.Wallet(privateKey, provider);

  const tx = {
    to,
    value: ethers.utils.parseEther(amount),
  };

  const response = await wallet.sendTransaction(tx);
  console.log("EVM Tx Hash:", response.hash);
  return response.hash;
}
