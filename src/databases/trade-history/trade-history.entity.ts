import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class TradeHistory {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  sourceChain!: string;

  @Column()
  sourceWalletAddress!: string;

  @Column()
  sourceNativeAmount!: string;

  @Column()
  steps!: string;

  @Column({ nullable: true })
  crossChainTx?: string;

  @Column({ nullable: true })
  crossChainStatus?: string;

  @Column({ nullable: true })
  crossChainAmount?: string;

  @Column()
  targetChain!: string;

  @Column()
  targetWalletAddress!: string;

  @Column()
  memeTokenAddress!: string;

  @Column()
  action!: string;

  @Column({ nullable: true })
  amountIn!: string;

  @Column({ nullable: true })
  amountOut!: string;

  @Column({ nullable: true })
  swapTx!: string;

  @Column({ nullable: true })
  swapStatus!: string;

  @Column({ nullable: true })
  error?: string;

  @Column({ type: "bigint" })
  timestamp!: number;
}
