import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Referral } from "./referrals.entity";
import { User } from "@databases/users/users.entity";
import { Wallet } from "@databases/wallets/wallets.entity";
import { TradeHistory } from "@databases/trade-history/trade-history.entity";
import { ReferralsService } from "./referrals.service";

@Module({
  imports: [TypeOrmModule.forFeature([Referral, User, Wallet, TradeHistory])],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
