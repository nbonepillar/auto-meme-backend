import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { LimitsService } from "@databases/limits/limits.service";
import { CreateLimitOrderDto } from "@databases/limits/limits.dto.request";

@Controller("limits")
export class LimitsController {
  constructor(private readonly limitsService: LimitsService) {}

  @Post("create")
  async createLimit(@Body() dto: CreateLimitOrderDto) {
    try {
      const result = await this.limitsService.createLimitOrder(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : "Failed to create limit order",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
