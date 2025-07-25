import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TradeHistory } from "./trade-history.entity";

@Injectable()
export class TradeHistoryService {
  constructor(
    @InjectRepository(TradeHistory)
    private readonly repository: Repository<TradeHistory>,
  ) {}

  async saveTrade(data: Partial<TradeHistory>) {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }
}
