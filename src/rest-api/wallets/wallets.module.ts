import { Module } from "@nestjs/common";
import { WalletController } from "./wallets.controller";
import { WalletsModule as DBWalletsModule } from "@databases/wallets/wallets.module";
import { TokenModule as DBTokenModule } from "@databases/tokens/tokens.module";
import { ReferralsModule } from "@databases/referrals/referrals.module";
import { TransactionModule } from "@databases/transactions/transactions.module";
import { WorkerModule } from "@workers/worker.module";

@Module({
  imports: [
    DBWalletsModule,
    DBTokenModule,
    ReferralsModule,
    TransactionModule,
    WorkerModule,
  ],
  controllers: [WalletController],
  exports: [],
})
export class WalletsModule {}
