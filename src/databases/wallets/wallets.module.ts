import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Wallet } from "./wallets.entity";
import { WalletsService } from "./wallets.service";

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
