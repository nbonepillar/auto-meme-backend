import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
@Entity("transactions", {
  synchronize: false,
})
@Index(["transTime", "token", "chain"])
@Index(["chain"]) // Single column index
@Index(["token"])
@Index(["wallet"])
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;
  @Column("varchar", {
    length: 20,
    nullable: false,
  })
  chain!: string;
  @Column("varchar", {
    length: 100,
    nullable: false,
  })
  token!: string;
  @Column("varchar", {
    length: 100,
    nullable: false,
    name: "wallet",
  })
  wallet!: string;
  @Column("boolean", {
    nullable: false,
  })
  is_buy!: boolean;
  @Column("numeric", {
    nullable: false,
    name: "token_amount",
  })
  tokenAmount!: number;
  @Column("numeric", {
    nullable: false,
    name: "native_amount",
  })
  nativeAmount!: number;
  @Column("numeric", {
    nullable: false,
  })
  price!: number;
  @Column("numeric", {
    nullable: false,
    name: "trans_time",
  })
  transTime!: number;

  @Column("varchar", {
    length: 100,
    nullable: true,
    name: "tx",
  })
  txHash!: string;
}
