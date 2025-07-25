import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./users.entity";
import { UserController } from "../../rest-api/users/users.controller";
import { UserService } from "../../rest-api/users/users.service";
import { JwtModule } from "@nestjs/jwt";
import { Wallet } from "../wallets/wallets.entity";
import { Referral } from "@databases/referrals/referrals.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Wallet, Referral]),
    JwtModule.register({
      secret: "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
