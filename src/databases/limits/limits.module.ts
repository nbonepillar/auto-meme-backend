import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Limits } from "@databases/limits/limits.entity";
import { LimitsService } from "./limits.service";

@Module({
  imports: [TypeOrmModule.forFeature([Limits])],
  providers: [LimitsService],
  exports: [LimitsService],
})
export class LimitsModule {}
