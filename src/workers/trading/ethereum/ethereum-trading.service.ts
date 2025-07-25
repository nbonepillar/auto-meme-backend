import { Injectable, Logger } from "@nestjs/common";
import { ethers, BigNumber, Contract } from "ethers";
import {
  AlphaRouter,
  SwapType,
  SwapRoute,
  SwapOptionsSwapRouter02,
} from "@uniswap/smart-order-router";
import {
  CurrencyAmount,
  Token,
  TradeType,
  Percent,
  Ether,
} from "@uniswap/sdk-core";
import { ChainId } from "@uniswap/sdk-core";

export interface EthereumTradeParams {
  walletAddress: string;
  privateKey: string;
  action: "buy" | "sell";
  tokenAddress: string;
  amount: string;
  denominatedInEth: boolean;
  slippage: number;
  maxGasPrice?: string;
  deadline?: number;
}

export interface EthereumTradeResult {
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

export interface EthereumHealthCheck {
  rpcConnected: boolean;
  walletConnected: boolean;
  chainId: number;
  blockNumber: number;
  ethBalance: string;
  network: string;
}

@Injectable()
export class EthereumTradingService {
  private readonly logger = new Logger(EthereumTradingService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private alphaRouter: AlphaRouter;

  // Network configuration
  private readonly isTestNet = false; // MAINNET

  // Addresses based on network
  private readonly WETH_ADDRESS: string;
  private readonly SWAP_ROUTER_ADDRESS: string;
  private readonly CHAIN_ID: ChainId;
  private readonly EXPLORER_URL: string;

  // Standard ERC-20 ABI
  private readonly ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
  ];

  constructor() {
    if (this.isTestNet) {
      // Sepolia testnet
      this.WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
      this.SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
      this.CHAIN_ID = ChainId.SEPOLIA;
      this.EXPLORER_URL = "https://sepolia.etherscan.io";

      const rpcUrl =
        process.env.SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/YOUR_API_KEY";
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    } else {
      // Ethereum mainnet
      this.WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
      this.SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
      this.CHAIN_ID = ChainId.MAINNET;
      this.EXPLORER_URL = "https://etherscan.io";

      const rpcUrl =
        process.env.ETHEREUM_RPC_URL ||
        "https://mainnet.infura.io/v3/YOUR_API_KEY";
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    }

    // Initialize Alpha Router
    this.alphaRouter = new AlphaRouter({
      chainId: this.CHAIN_ID,
      provider: this.provider,
    });
  }

  /**
   * Health check
   */
  async healthCheck(walletAddress?: string): Promise<EthereumHealthCheck> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      let ethBalance = "0";
      let walletConnected = false;

      if (walletAddress && ethers.utils.isAddress(walletAddress)) {
        const balance = await this.provider.getBalance(walletAddress);
        ethBalance = ethers.utils.formatEther(balance);
        walletConnected = true;
      }

      return {
        rpcConnected: true,
        walletConnected,
        chainId: network.chainId,
        blockNumber,
        ethBalance,
        network: this.isTestNet ? "Sepolia" : "Mainnet",
      };
    } catch (error) {
      this.logger.error("Health check failed:", error);
      return {
        rpcConnected: false,
        walletConnected: false,
        chainId: 0,
        blockNumber: 0,
        ethBalance: "0",
        network: "Unknown",
      };
    }
  }

  /**
   * Main trade execution function using AlphaRouter
   */
  async executeTrade(
    params: EthereumTradeParams,
  ): Promise<EthereumTradeResult> {
    try {
      this.logger.log(
        `Executing ${params.action} trade for token ${params.tokenAddress}`,
      );

      // Validate inputs
      if (!ethers.utils.isAddress(params.walletAddress)) {
        throw new Error("Invalid wallet address");
      }
      if (!ethers.utils.isAddress(params.tokenAddress)) {
        throw new Error("Invalid token address");
      }

      const wallet = new ethers.Wallet(params.privateKey, this.provider);

      // Get token info
      const token = await this.getTokenInfo(params.tokenAddress);

      // Generate route using AlphaRouter
      const route = await this.generateRoute(token, params);

      if (!route) {
        throw new Error("No route found");
      }

      // Approve tokens if needed (for sell trades)
      if (params.action === "sell") {
        await this.approveTokenIfNeeded(wallet, params.tokenAddress);
      }

      // Execute trade
      const result = await this.executeRoute(wallet, route);

      return {
        success: true,
        transactionHash: result.transactionHash,
        explorerUrl: `${this.EXPLORER_URL}/tx/${result.transactionHash}`,
        gasUsed: result.gasUsed,
        effectiveGasPrice: result.effectiveGasPrice,
        amountIn: route.trade.inputAmount.toExact(),
        amountOut: route.trade.outputAmount.toExact(),
        route: route.route
          .map((r) => r.tokenPath.map((t) => t.symbol).join(" → "))
          .join(", "),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error("Trade execution failed:", errorMsg);
      return {
        success: false,
        error: `Error occurred, ${errorMsg}`,
      };
    }
  }

  /**
   * Generate route using AlphaRouter (based on Uniswap example)
   */
  private async generateRoute(
    token: Token,
    params: EthereumTradeParams,
  ): Promise<SwapRoute | null> {
    const deadline = Math.floor(Date.now() / 1000) + (params.deadline || 1200);

    const options: SwapOptionsSwapRouter02 = {
      recipient: params.walletAddress,
      slippageTolerance: new Percent(Math.floor(params.slippage * 100), 10000),
      deadline: deadline,
      type: SwapType.SWAP_ROUTER_02,
    };

    if (params.action === "buy") {
      // ETH -> Token
      const amountIn = params.denominatedInEth ? params.amount : params.amount; // TODO: convert if needed

      const currencyAmountIn = CurrencyAmount.fromRawAmount(
        Ether.onChain(this.CHAIN_ID),
        ethers.utils.parseEther(amountIn).toString(),
      );

      return await this.alphaRouter.route(
        currencyAmountIn,
        token,
        TradeType.EXACT_INPUT,
        options,
      );
    } else {
      // Token -> ETH
      const amountIn = params.denominatedInEth
        ? params.amount // TODO: convert to token amount
        : params.amount;

      const currencyAmountIn = CurrencyAmount.fromRawAmount(
        token,
        ethers.utils.parseUnits(amountIn, token.decimals).toString(),
      );

      return await this.alphaRouter.route(
        currencyAmountIn,
        Ether.onChain(this.CHAIN_ID),
        TradeType.EXACT_INPUT,
        options,
      );
    }
  }

  /**
   * Execute route (based on Uniswap example)
   */
  private async executeRoute(
    wallet: ethers.Wallet,
    route: SwapRoute,
  ): Promise<any> {
    if (!route.methodParameters) {
      throw new Error("No method parameters available");
    }

    const transaction = {
      data: route.methodParameters.calldata,
      to: this.SWAP_ROUTER_ADDRESS,
      value: route.methodParameters.value,
      from: wallet.address,
    };

    const gasEstimate = await this.provider.estimateGas(transaction);
    const gasPrice = await this.provider.getGasPrice();
    const txWithGas = {
      ...transaction,
      gasLimit: gasEstimate.mul(110).div(100),
      gasPrice: gasPrice.mul(110).div(100),
      maxFeePerGas: gasPrice.mul(120).div(100),
      maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
    };
    const txResponse = await wallet.sendTransaction(txWithGas);
    this.logger.log(`Transaction sent: ${txResponse.hash}`);

    const receipt = await txResponse.wait();
    this.logger.log(`Transaction confirmed: ${receipt.transactionHash}`);

    return {
      transactionHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString() || "0",
    };
  }

  /**
   * Approve tokens for SwapRouter (based on Uniswap example)
   */
  private async approveTokenIfNeeded(
    wallet: ethers.Wallet,
    tokenAddress: string,
  ): Promise<void> {
    const tokenContract = new Contract(tokenAddress, this.ERC20_ABI, wallet);

    // Check current allowance
    const currentAllowance = await tokenContract.allowance(
      wallet.address,
      this.SWAP_ROUTER_ADDRESS,
    );

    // If allowance is low, approve max amount
    const minAllowance = ethers.utils.parseUnits("1000000", 18); // 1M tokens

    if (currentAllowance.lt(minAllowance)) {
      this.logger.log("Approving tokens for SwapRouter...");

      const approveTx = await tokenContract.approve(
        this.SWAP_ROUTER_ADDRESS,
        ethers.constants.MaxUint256,
      );

      await approveTx.wait();
      this.logger.log("Token approval confirmed");
    }
  }

  /**
   * Get token information
   */
  private async getTokenInfo(tokenAddress: string): Promise<Token> {
    const tokenContract = new Contract(
      tokenAddress,
      this.ERC20_ABI,
      this.provider,
    );
    const [decimals, symbol, name] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name(),
    ]);

    return new Token(this.CHAIN_ID, tokenAddress, decimals, symbol, name);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(
    walletAddress: string,
    tokenAddress: string,
  ): Promise<string> {
    try {
      const tokenContract = new Contract(
        tokenAddress,
        this.ERC20_ABI,
        this.provider,
      );
      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      this.logger.error("Failed to get token balance:", error);
      return "0";
    }
  }

  /**
   * Get ETH balance
   */
  async getEthBalance(walletAddress: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      this.logger.error("Failed to get ETH balance:", error);
      return "0";
    }
  }
}
