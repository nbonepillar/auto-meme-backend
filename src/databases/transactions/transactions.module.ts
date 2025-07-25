import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transaction } from "@databases/transactions/transactions.entity";
import { TransactionsService } from "@databases/transactions/transactions.service";

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [],
  providers: [TransactionsService],
  exports: [TypeOrmModule, TransactionsService],
})
export class TransactionModule {}
