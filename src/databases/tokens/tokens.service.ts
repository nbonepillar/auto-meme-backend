import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Tokens } from "./tokens.entity";
import Logger from "@common/logger";
import { OnEvent } from "@nestjs/event-emitter";
import { BaseTokenInfo } from "../../workers/bitquery/bitquery.types";

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(Tokens)
    private readonly tokenRepository: Repository<Tokens>,
  ) {}

  @OnEvent("token.created")
  async handleTokenCreated(payload: BaseTokenInfo[]) {
    // Add new token to Tokens table
    Logger.getInstance().info("handleTokenCreated");
    for (const token of payload) {
      let cleanSymbol = token.symbol.replace(/\0/g, "").trim();
      if (cleanSymbol === "") cleanSymbol = " ";

      let cleanName = token.name.replace(/\0/g, "").trim();
      if (cleanName === "") cleanName = " ";

      let input: Tokens = new Tokens();
      input.symbol = cleanSymbol;
      input.name = cleanName;
      input.address = token.address;
      input.network = token.network;
      input.degen_audit = token.degen_audit;
      input.uri = token.uri;
      input.total_supply = token.total_supply;
      input.created_at = token.created_at;

      try {
        await this.tokenRepository.save(input);
      } catch (e: any) {
        if (
          e.code === "23505" || // Postgres unique violation
          (e.message && e.message.includes("duplicate key"))
        ) {
          continue;
        }
        console.error("Error saving token:", e);
      }
    }
  }

  async findByAddresses(tokenAddresses: string[]) {
    return this.tokenRepository.find({
      where: {
        address: In(tokenAddresses),
      },
    });
  }
}
