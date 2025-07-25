import { Module } from "@nestjs/common";
import { UserController } from "@rest-api/users/users.controller";
import { UserService } from "@rest-api/users/users.service";
import { UserModule as DBUserModule } from "@databases/users/users.module";
import { WalletsModule as DBWalletModule } from "@databases/wallets/wallets.module";

@Module({
  imports: [DBUserModule, DBWalletModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
