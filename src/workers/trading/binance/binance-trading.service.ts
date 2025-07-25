import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseUnits,
  maxUint256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import {
  TOKEN_MANAGER_HELPER_ABI,
  TOKEN_MANAGER_V1_ABI,
  TOKEN_MANAGER_V2_ABI,
  ERC20_ABI,
  SwapX_ABI,
  SWAPX_ADDRESS,
  PANCAKE_FACTORY_V3,
  USD1_ADDRESS,
  BNB_ADDRESS,
  WBNB_ADDRESS,
} from "@workers/trading/binance/lib/constants";
import {
  getBuyParams,
  getPanCakePoolInfo,
  getTokenAllowance,
  getTokenBalance,
  getTokenInfo,
  getWalletNonce,
  getProvider,
  formatTokenBalance,
} from "@workers/trading/binance/lib/helper-contracts";
import {
  sendBatchTxs,
  sendBundleTxs,
  senPrivateTxs,
} from "@workers/trading/binance/lib/bloxroute";
import { getWalletClient } from "@workers/trading/binance/lib/wallet";
import {
  BSCTokenInfo,
  BSCBuyParams,
} from "@workers/trading/binance/binance-trading.types";
import Logger from "@common/logger";

const BUY_GAS_LIMIT = BigInt(900000);
const SELL_GAS_LIMIT = BigInt(500000);
const APPROVE_GAS_LIMIT = BigInt(100000);

export interface BinanceTradeParams {
  walletAddress: string;
  privateKey: string;
  action: "buy" | "sell";
  tokenAddress: string;
  amount: string;
  denominatedInBSC: boolean;
  slippage: number;
  maxGasPrice?: string;
  deadline?: number;
}

export interface BinanceTradeResult {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  amountIn?: string;
  amountOut?: string;
  route?: string;
}

const BSC_RPC_URL = "https://bsc-dataseed.binance.org";
const publicBscClient = createPublicClient({
  chain: bsc,
  transport: http(BSC_RPC_URL),
});

export const TOKEN_MANAGER_HELPER_ADDRESS =
  "0xF251F83e40a78868FcfA3FA4599Dad6494E46034";
const EXPLORER_URL = "https://bscscan.com";

@Injectable()
export class BinanceTradingService {
  constructor() {}

  /**
   * Main trade execution function using AlphaRouter
   */
  async executeTrade(params: BinanceTradeParams): Promise<BinanceTradeResult> {
    try {
      Logger.getInstance().info(
        `Executing ${params.action} trade for token ${params.tokenAddress}`,
      );
      if (params.privateKey.startsWith("0x") === false) {
        params.privateKey = "0x" + params.privateKey;
      }

      // check the pool exists on pancake swap
      const poolAddress = await getPanCakePoolInfo(params.tokenAddress);
      const isMigrated =
        poolAddress !== undefined &&
        poolAddress !== "0x0000000000000000000000000000000000000000";
      if (isMigrated) {
        if (params.action === "buy") {
          return buyTokenByPancakeSwap(params, poolAddress);
        }
        return sellTokenByPancakeSwap(params, poolAddress);
      } else {
        if (params.action === "buy") {
          return buyToken(params);
        }
        return sellToken(params);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.getInstance().error("Trade execution failed:", errorMsg);
      return {
        success: false,
        error: `Error occurred, ${errorMsg}`,
      };
    }
  }

  /**
   * Get token information
   */
  private async getTokenInfo(tokenAddress: string): Promise<BSCTokenInfo> {
    const data = await publicBscClient.readContract({
      address: TOKEN_MANAGER_HELPER_ADDRESS,
      abi: TOKEN_MANAGER_HELPER_ABI,
      functionName: "getTokenInfo",
      args: [tokenAddress as `0x${string}`],
    });

    return {
      version: Number(data[0]),
      tokenManager: data[1],
      quote: data[2],
      lastPrice: data[3],
      tradingFeeRate: data[4],
      minTradingFee: data[5],
      launchTime: data[6],
      offers: data[7],
      maxOffers: data[8],
      funds: data[9],
      maxFunds: data[10],
      liquidityAdded: data[11],
    };
  }
}

async function buyToken(
  params: BinanceTradeParams,
): Promise<BinanceTradeResult> {
  const tokenAddress = params.tokenAddress;
  const bnbAmount = params.amount;

  const tokenInfo = await getTokenInfo(tokenAddress);
  const tokenManagerAddress = tokenInfo.tokenManager;
  const version = tokenInfo.version;

  const buyParams = await getBuyParams(tokenAddress, bnbAmount);

  let to: `0x${string}`, data: `0x${string}`;
  to = tokenManagerAddress;
  if (buyParams.quote === BNB_ADDRESS || buyParams.quote === WBNB_ADDRESS) {
    // in case of buy with BNB
    data = encodeFunctionData({
      abi: SwapX_ABI,
      functionName: "buyMemeToken",
      args: [
        tokenManagerAddress,
        tokenAddress as `0x${string}`,
        params.walletAddress as `0x${string}`,
        buyParams.amountFunds,
        BigInt(0),
      ],
    });
  } else {
    // in case of buy with USD1
    data = encodeFunctionData({
      abi: SwapX_ABI,
      functionName: "buyMemeToken2",
      args: [
        {
          route: "v3",
          fee: 500,
          factory: PANCAKE_FACTORY_V3,
          tokenMiddle: buyParams.quote,
          token: tokenAddress as `0x${string}`,
          recipient: params.walletAddress as `0x${string}`,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 10),
          amountIn: buyParams.amountFunds,
          amountOutMinimum: BigInt(0),
        },
      ],
    });
  }

  Logger.getInstance().info("data:", data);

  const walletClient = await getWalletClient(
    params.privateKey as `0x${string}`,
  );
  Logger.getInstance().info("walletClient: ", walletClient);
  const nonce = await getWalletNonce(walletClient.account?.address ?? "");

  const txs = [];
  // Sign transaction
  if (!walletClient.account) {
    throw new Error("Wallet client account is undefined");
  }
  const signature = await walletClient.signTransaction({
    account: walletClient.account,
    nonce: nonce,
    to: SWAPX_ADDRESS,
    value: buyParams.amountFunds,
    chain: bsc,
    gasPrice: parseUnits("10", 9),
    gas: BUY_GAS_LIMIT,
    data: data,
  });

  try {
    const { txHash, finalBalance } = await sendTxAndGetBalance(
      signature,
      params.walletAddress,
      params.tokenAddress,
      "buy",
    );

    return {
      success: true,
      transactionHash: txHash,
      explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      amountIn: params.amount,
      amountOut: finalBalance,
    };
  } catch (error) {
    Logger.getInstance().error(error);
    return {
      success: false,
      transactionHash: "",
      explorerUrl: "",
      amountIn: params.amount,
      amountOut: "",
    };
  }
}

async function sellToken(
  params: BinanceTradeParams,
): Promise<BinanceTradeResult> {
  const tokenAddress = params.tokenAddress;
  const sellPercentage = 50;

  // Get token info to determine which version of TokenManager to use
  const tokenInfo = await getTokenInfo(tokenAddress);
  const tokenManagerAddress = tokenInfo.tokenManager;
  const version = tokenInfo.version;

  const txs = [];

  const walletClient = getWalletClient(params.privateKey as `0x${string}`);
  if (!walletClient.account) {
    throw new Error("Wallet client account is undefined");
  }
  let nonce = await getWalletNonce(walletClient.account.address);
  const balance = await getTokenBalance(
    tokenAddress,
    walletClient.account.address,
  );

  // Skip if wallet doesn't have any tokens
  if (balance <= BigInt(0)) {
    Logger.getInstance().info(
      `Wallet ${walletClient.account.address} has no tokens`,
    );
    throw new Error("Wallet has no token balance");
  }

  const decimals = 18;
  const amountToSell = BigInt(
    Math.floor(parseFloat(params.amount) * 10 ** decimals),
  );
  Logger.getInstance().info("amountToSell:", amountToSell);
  Logger.getInstance().info("balance:", balance);

  const provider = getProvider();

  // Check current allowance
  const allowance = await getTokenAllowance(
    tokenAddress,
    walletClient.account.address,
    tokenManagerAddress,
  );

  /**
   * ================================
   * APPROVE
   * ================================
   */
  if (allowance < BigInt(amountToSell)) {
    Logger.getInstance().info(
      `Current allowance (${allowance}) is less than amount to sell (${amountToSell}). Approving max value.`,
    );

    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [tokenManagerAddress, maxUint256],
    });

    const approveSignature = await walletClient.signTransaction({
      account: walletClient.account,
      nonce: nonce,
      to: tokenAddress as `0x${string}`,
      value: BigInt(0),
      chain: bsc,
      gasPrice: parseUnits("3", 9),
      gas: APPROVE_GAS_LIMIT,
      data: approveData,
    });

    txs.push(approveSignature.slice(2));
    let txApprove = null;
    try {
      txApprove = await provider.send("eth_sendRawTransaction", [
        approveSignature,
      ]);
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
    nonce++;
  } else {
    Logger.getInstance().info(
      `Current allowance (${allowance}) is sufficient for amount to sell (${amountToSell}). Skipping approval.`,
    );
  }

  Logger.getInstance().info("version:", version);
  Logger.getInstance().info("nonce:", nonce);
  Logger.getInstance().info("tokenManagerAddress:", tokenManagerAddress);
  Logger.getInstance().info("amountToSell:", amountToSell);
  Logger.getInstance().info("tokenAddress:", tokenAddress);
  const roundedAmount =
    (BigInt(amountToSell) / BigInt(1000000000000)) * BigInt(1000000000000);
  Logger.getInstance().info("roundedAmount:", roundedAmount);

  /**
   * ================================
   * SELL
   * ================================
   */
  let sellData: `0x${string}`;
  if (version === 1) {
    // Use V1 TokenManager
    sellData = encodeFunctionData({
      abi: TOKEN_MANAGER_V1_ABI,
      functionName: "saleToken",
      args: [tokenAddress as `0x${string}`, roundedAmount],
    });
  } else {
    // Use V2 TokenManager
    sellData = encodeFunctionData({
      abi: TOKEN_MANAGER_V2_ABI,
      functionName: "sellToken",
      args: [tokenAddress as `0x${string}`, roundedAmount],
    });
  }
  Logger.getInstance().info("Sell data:", sellData);
  const sellSignature = await walletClient.signTransaction({
    account: walletClient.account,
    nonce: nonce,
    to: tokenManagerAddress,
    value: BigInt(0),
    chain: bsc,
    gasPrice: parseUnits("10", 9),
    gas: SELL_GAS_LIMIT * BigInt(2), // Higher gas limit for token sales
    data: sellData,
  });

  try {
    const { txHash, finalBalance } = await sendTxAndGetBalance(
      sellSignature,
      params.walletAddress,
      params.tokenAddress,
      "sell",
    );

    return {
      success: true,
      transactionHash: txHash,
      explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      amountIn: params.amount,
      amountOut: finalBalance,
    };
  } catch (error) {
    Logger.getInstance().error(error);
    return {
      success: false,
      transactionHash: "",
      explorerUrl: "",
      amountIn: params.amount,
      amountOut: "",
    };
  }
}

async function buyTokenByPancakeSwap(
  params: BinanceTradeParams,
  poolAddress: string,
): Promise<BinanceTradeResult> {
  const tokenAddress = params.tokenAddress;
  const bnbAmount = params.amount;

  const tokenInfo = await getTokenInfo(tokenAddress);
  const tokenManagerAddress = tokenInfo.tokenManager;
  const version = tokenInfo.version;

  const buyParams = await getBuyParams(tokenAddress, bnbAmount);

  let to: `0x${string}`, data: `0x${string}`;
  to = tokenManagerAddress;
  // in case of buy with USD1
  data = encodeFunctionData({
    abi: SwapX_ABI,
    functionName: "swapV2ExactIn",
    args: [
      BNB_ADDRESS as `0x${string}`,
      tokenAddress as `0x${string}`,
      buyParams.amountFunds,
      BigInt(0),
      poolAddress as `0x${string}`,
    ],
  });

  Logger.getInstance().info("data:", data);

  const walletClient = await getWalletClient(
    params.privateKey as `0x${string}`,
  );
  Logger.getInstance().info("walletClient: ", walletClient);
  const nonce = await getWalletNonce(walletClient.account?.address ?? "");

  const txs = [];
  // Sign transaction
  if (!walletClient.account) {
    throw new Error("Wallet client account is undefined");
  }
  const signature = await walletClient.signTransaction({
    account: walletClient.account,
    nonce: nonce,
    to: SWAPX_ADDRESS,
    value: buyParams.amountFunds,
    chain: bsc,
    gasPrice: parseUnits("10", 9),
    gas: BUY_GAS_LIMIT,
    data: data,
  });

  try {
    const { txHash, finalBalance } = await sendTxAndGetBalance(
      signature,
      params.walletAddress,
      params.tokenAddress,
      "buy",
    );

    return {
      success: true,
      transactionHash: txHash,
      explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      amountIn: params.amount,
      amountOut: finalBalance,
    };
  } catch (error) {
    Logger.getInstance().error(error);
    return {
      success: false,
      transactionHash: "",
      explorerUrl: "",
      amountIn: params.amount,
      amountOut: "",
    };
  }
  // return { txHash: bundle.result?.bundleHash || "Bundle submitted" };
}

async function sellTokenByPancakeSwap(
  params: BinanceTradeParams,
  poolAddress: string,
): Promise<BinanceTradeResult> {
  const tokenAddress = params.tokenAddress;
  const sellPercentage = 50;

  // Get token info to determine which version of TokenManager to use
  const tokenInfo = await getTokenInfo(tokenAddress);
  const tokenManagerAddress = tokenInfo.tokenManager;
  const version = tokenInfo.version;

  const txs = [];

  const walletClient = getWalletClient(params.privateKey as `0x${string}`);
  if (!walletClient.account) {
    throw new Error("Wallet client account is undefined");
  }
  let nonce = await getWalletNonce(walletClient.account.address);
  const balance = await getTokenBalance(
    tokenAddress,
    walletClient.account.address,
  );

  // Skip if wallet doesn't have any tokens
  if (balance <= BigInt(0)) {
    Logger.getInstance().info(
      `Wallet ${walletClient.account.address} has no tokens`,
    );
    throw new Error("Wallet has no token balance");
  }

  const decimals = 18;
  const amountToSell = BigInt(
    Math.floor(parseFloat(params.amount) * 10 ** decimals),
  );
  Logger.getInstance().info("amountToSell:", amountToSell);
  Logger.getInstance().info("balance:", balance);

  Logger.getInstance().info("version:", version);
  Logger.getInstance().info("nonce:", nonce);
  Logger.getInstance().info("tokenManagerAddress:", tokenManagerAddress);
  Logger.getInstance().info("amountToSell:", amountToSell);
  Logger.getInstance().info("tokenAddress:", tokenAddress);
  const roundedAmount =
    (BigInt(amountToSell) / BigInt(1000000000000)) * BigInt(1000000000000);
  Logger.getInstance().info("roundedAmount:", roundedAmount);

  /**
   * ================================
   * APPROVE
   * ================================
   */
  const provider = getProvider();
  const allowance = await getTokenAllowance(
    tokenAddress,
    walletClient.account.address,
    tokenManagerAddress,
  );

  if (allowance < BigInt(amountToSell)) {
    Logger.getInstance().info(
      `Current allowance (${allowance}) is less than amount to sell (${amountToSell}). Approving max value.`,
    );

    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SWAPX_ADDRESS, maxUint256],
    });

    const approveSignature = await walletClient.signTransaction({
      account: walletClient.account,
      nonce: nonce,
      to: tokenAddress as `0x${string}`,
      value: BigInt(0),
      chain: bsc,
      gasPrice: parseUnits("3", 9),
      gas: APPROVE_GAS_LIMIT,
      data: approveData,
    });

    let txApproveResponse = null;
    try {
      txApproveResponse = await provider.send("eth_sendRawTransaction", [
        approveSignature.slice(2),
      ]);
    } catch (error) {
      console.error("Error approve:", error);
    }

    txs.push(approveSignature.slice(2));
    nonce++;
  } else {
    Logger.getInstance().info(
      `Current allowance (${allowance}) is sufficient for amount to sell (${amountToSell}). Skipping approval.`,
    );
  }

  /**
   * ================================
   * SELL
   * ================================
   */
  let sellData: `0x${string}`;
  sellData = encodeFunctionData({
    abi: SwapX_ABI,
    functionName: "swapV2ExactIn",
    args: [
      tokenAddress as `0x${string}`,
      BNB_ADDRESS as `0x${string}`,
      roundedAmount,
      BigInt(0),
      poolAddress as `0x${string}`,
    ],
  });
  Logger.getInstance().info("Sell data:", sellData);
  const sellSignature = await walletClient.signTransaction({
    account: walletClient.account,
    nonce: nonce,
    to: SWAPX_ADDRESS,
    value: BigInt(0),
    chain: bsc,
    gasPrice: parseUnits("10", 9),
    gas: BUY_GAS_LIMIT * BigInt(3), // Higher gas limit for token sales
    data: sellData,
  });

  try {
    const { txHash, finalBalance } = await sendTxAndGetBalance(
      sellSignature,
      params.walletAddress,
      params.tokenAddress,
      "sell",
    );

    return {
      success: true,
      transactionHash: txHash,
      explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      amountIn: params.amount,
      amountOut: finalBalance,
    };
  } catch (error) {
    Logger.getInstance().error(error);
    return {
      success: false,
      transactionHash: "",
      explorerUrl: "",
      amountIn: params.amount,
      amountOut: "",
    };
  }
  // return { txHash: bundle.result?.bundleHash || "Bundle submitted" };
}

async function sendTxAndGetBalance(
  signedTxHex: string,
  walletAddress: string,
  tokenAddress: string,
  type: "buy" | "sell",
): Promise<{ txHash: string; finalBalance: string }> {
  const provider = getProvider();

  let initialBalance: string;
  if (type === "buy") {
    // token balance
    initialBalance = (
      await getTokenBalance(tokenAddress, walletAddress)
    ).toString();
  } else {
    // native token balance (BNB)
    initialBalance = (await provider.getBalance(walletAddress)).toString();
  }
  const rawTx = signedTxHex.startsWith("0x")
    ? signedTxHex.slice(2)
    : signedTxHex;
  let txHash: string;
  try {
    txHash = await provider.send("eth_sendRawTransaction", [rawTx]);
    Logger.getInstance().info("Tx sent. Hash:", txHash);
  } catch (error) {
    Logger.getInstance().error("Error sending transaction:", error);
    throw error;
  }

  // wait for confirmation
  let receipt = null;
  for (let i = 0; i < 30; i++) {
    receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      if (receipt.status === 1) break; // success
      if (receipt.status === 0) throw new Error("Transaction failed on chain");
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  if (!receipt || receipt.status !== 1) {
    throw new Error("Transaction not confirmed or failed");
  }

  // get Balance
  let finalBalance: string;
  if (type === "buy") {
    // token balance
    finalBalance = (
      await getTokenBalance(tokenAddress, walletAddress)
    ).toString();
  } else {
    // native token balance (BNB)
    finalBalance = (await provider.getBalance(walletAddress)).toString();
  }

  const initialBalanceBN = BigInt(initialBalance);
  const finalBalanceBN = BigInt(finalBalance);
  finalBalance = formatTokenBalance(
    (finalBalanceBN - initialBalanceBN).toString(),
    18,
  );

  return { txHash, finalBalance };
}
