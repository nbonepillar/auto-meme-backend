import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { Wallet } from "@databases/wallets/wallets.entity";
import { createEvmWallet } from "@common/chain/chain.ethereum";
import { createSolanaWallet } from "@common/chain/chain.solana";

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async findByAddress(address: string, network: string) {
    return this.walletRepo.findOne({
      where: {
        address: ILike(address),
        network: ILike(network),
      },
    });
  }

  async findByUserId(user_id: string) {
    return this.walletRepo.find({
      where: {
        user_id,
      },
    });
  }

  async createAllWallet(user_id: string) {
    const evmWallet = createEvmWallet();
    const solanaWallet = createSolanaWallet();

    let wallet: Wallet = new Wallet();
    try {
      // Ethereum Wallet
      wallet.address = evmWallet.walletAddress;
      wallet.is_default = true;
      wallet.network = "eth";
      wallet.user_id = user_id;
      wallet.private_key = evmWallet.privateKey;
      await this.walletRepo.save(wallet);

      // BSC
      wallet = new Wallet();
      wallet.address = evmWallet.walletAddress;
      wallet.is_default = true;
      wallet.network = "bsc";
      wallet.user_id = user_id;
      wallet.private_key = evmWallet.privateKey;
      await this.walletRepo.save(wallet);

      // Solana
      wallet = new Wallet();
      wallet.address = solanaWallet.walletAddress;
      wallet.is_default = true;
      wallet.network = "sol";
      wallet.user_id = user_id;
      wallet.private_key = solanaWallet.privateKey;
      await this.walletRepo.save(wallet);
    } catch (e) {
      console.error("Error creating wallets: ", e);
    }

    return {
      eth: evmWallet.walletAddress,
      bsc: evmWallet.walletAddress,
      sol: solanaWallet.walletAddress,
    };
  }

  async saveWallet(wallet: Wallet) {
    try {
      await this.walletRepo.save(wallet);
    } catch (e) {
      console.error("Error saving wallet: ", e);
    }
  }

  async setDefaultWallet(user_id: string, network: string, address: string) {
    // reset all wallet's for owners default status
    await this.walletRepo.update({ user_id, network }, { is_default: false });

    // set wallet's default status
    await this.walletRepo.update(
      { user_id, network, address },
      { is_default: true },
    );
  }
}
