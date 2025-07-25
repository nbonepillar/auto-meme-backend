import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("token_price_history")
export class TokenPriceHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  token_address!: string;

  @Column("numeric")
  price!: number;

  @Column({ type: "timestamp" })
  timestamp!: Date;
}
