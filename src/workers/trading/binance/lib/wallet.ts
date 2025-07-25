import { Wallet } from "ethers";
import type { WalletClient } from "viem";
import {
  T_Wallet,
  Network,
  BSC_RPC_URL,
} from "@workers/trading/binance/lib/constants";
import { Address, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import Logger from "@common/logger";

async function create_solana_wallet(): Promise<T_Wallet> {
  try {
    const response = await fetch("https://pumpportal.fun/api/create-wallet", {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // JSON Object with keys for a newly generated wallet and the linked API key
    const data = await response.json();
    return {
      publicKey: data.publicKey,
      privateKey: data.privateKey,
      apiKey: data.apiKey,
      network: Network.SOL,
    };
  } catch (error) {
    Logger.getInstance().error("Error creating wallet:", error);
    throw error;
  }
}

async function create_evm_wallet(): Promise<T_Wallet> {
  try {
    const wallet = Wallet.createRandom();

    Logger.getInstance().info("Private Key:", wallet.privateKey);
    Logger.getInstance().info("Public Address:", wallet.address);
    Logger.getInstance().info("Mnemonic Phrase:", wallet.mnemonic?.phrase); // Mnemonic is optional

    return {
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      apiKey: wallet.mnemonic?.phrase,
      network: Network.ETH,
    };
  } catch (error) {
    throw error;
  }
}

export const getWalletClient = (privateKey: Address): WalletClient => {
  // return createWalletClient({
  //     account: privateKeyToAccount(privateKey),
  //     chain: bsc,
  //     transport: http(),
  // });
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    transport: http(BSC_RPC_URL),
  });
};
