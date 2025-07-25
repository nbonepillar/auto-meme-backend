import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tokens } from "./tokens.entity";
import { TokensService } from "./tokens.service";

@Module({
  imports: [TypeOrmModule.forFeature([Tokens])],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokenModule {}
