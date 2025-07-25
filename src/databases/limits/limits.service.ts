import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Limits } from "./limits.entity";
import { CreateLimitOrderDto } from "@databases/limits/limits.dto.request";
import { timeStamp } from "console";
import { getCurrentTimeStamp } from "@common/utils";

@Injectable()
export class LimitsService {
  constructor(
    @InjectRepository(Limits)
    private readonly limitsRepository: Repository<Limits>,
  ) {}

  /**
   * Create a standard limit order without TP/SL
   */
  async createLimitOrder(dto: CreateLimitOrderDto): Promise<Limits> {
    const order: Limits = new Limits();
    Object.assign(order, {
      wallet_address: dto.wallet_address,
      network: dto.network,
      token_address: dto.token_address,
      order_price: dto.order_price,
      mc: dto.mc?.toString(),
      action: dto.action,
      amount_in: dto.amount_in.toString(),
      error: "",
      extra: dto.extra,
      status: dto.status,
      order_type: dto.order_type,
      timeStamp: getCurrentTimeStamp(),
    });

    return await this.limitsRepository.save(order);
  }
}
