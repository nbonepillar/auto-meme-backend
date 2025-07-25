import { Entity, PrimaryGeneratedColumn, Column, Unique, Index } from "typeorm";
@Entity("token_holders", {
  synchronize: false,
})
@Index(["chain", "token", "wallet"], { unique: true }) // Composite unique index
@Index(["chain"]) // Single column index
@Index(["token"]) // Single column index
@Index(["wallet"]) // Single column index
export class TokenHolders {
  @PrimaryGeneratedColumn("uuid")
  id!: string;
  @Column("varchar", {
    length: 100,
    nullable: false,
  })
  token!: string;
  @Column("varchar", {
    length: 100,
    nullable: false,
  })
  wallet!: string;
  @Column("numeric")
  balance!: number;
  @Column("varchar", {
    length: 20,
    nullable: false,
  })
  chain!: string;
}
