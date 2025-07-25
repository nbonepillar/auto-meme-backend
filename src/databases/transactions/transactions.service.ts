import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Transaction } from "./transactions.entity";

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repository: Repository<Transaction>,
  ) {}

  // @OnEvent("token.traded")
  // handleTokenCreated(payload: BaseTokenTrade[], network: string) {
  //   for (const trade of payload) {
  //     const tx: Transaction = new Transaction();
  //     const isBuy = trade.method === TradeMethod.buy;
  //     const direction = isBuy ? "buy" : "sell";
  //     const reverseDirection = isBuy ? "sell" : "buy";
  //     const tokenAddr = trade[direction]?.address;
  //     const wallet = trade.buy.account;
  //     const tokenAmount = Number(trade[direction]?.amount);
  //     const nativeAmount = Number(trade[reverseDirection]?.amount);
  //     const price =
  //       parseFloat(trade[reverseDirection]?.amountInUSD) /
  //       parseFloat(trade[direction]?.amount);
  //     tx.chain = network;
  //     tx.token = tokenAddr;
  //     tx.wallet = wallet;
  //     tx.is_buy = isBuy;
  //     tx.tokenAmount = tokenAmount;
  //     tx.nativeAmount = nativeAmount;
  //     tx.price = price;
  //     tx.transTime = getCurrentTimeStamp(); // Must get the timestamp from on chain data
  //     tx.txHash = trade.txHash;

  //     this.repository.save(tx);
  //   }
  // }

  async findByWallet(walletAddress: string[]) {
    return this.repository.find({
      where: {
        wallet: In(walletAddress),
      },
    });
  }

  async findByHash(txHash: string): Promise<Transaction | null> {
    return await this.repository.findOne({
      where: { txHash },
    });
  }
}
