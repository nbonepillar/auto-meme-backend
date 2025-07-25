import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("trending_tokens", {
  synchronize: false,
})
export class TokenTrending {
  @PrimaryColumn()
  token!: string;

  @Column()
  chain!: string;

  @Column({ nullable: true })
  symbol!: string;

  @Column({ nullable: true })
  name!: string;

  @Column({ nullable: true })
  uri!: string;

  @Column("numeric", { nullable: true })
  created_at!: number;

  @Column()
  status: 0 | 1 | 2 = 0;

  @Column("numeric")
  buy_volume!: number;

  @Column("numeric")
  sell_volume!: number;

  @Column("numeric")
  txs!: number;

  @Column("numeric")
  price!: number;
}
