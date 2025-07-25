import { Entity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";

@Entity("tokens")
@Unique(["symbol", "name", "address", "network"])
export class Tokens {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column("varchar", {
    nullable: false,
  })
  symbol!: string;

  @Column("varchar", {
    nullable: false,
  })
  name!: string;

  @Column("varchar", {
    nullable: false,
    length: 100,
  })
  address!: string;

  @Column("varchar", {
    nullable: false,
    length: 10,
  })
  network!: string;

  @Column("varchar", {
    nullable: true,
  })
  degen_audit!: string;

  // TODO : need to consider interpreting meta information in the backend and sending it down to the front.
  @Column("varchar", {
    nullable: true,
  })
  uri!: string;

  @Column("numeric", {
    nullable: false,
  })
  total_supply!: number;

  @Column("numeric", { nullable: false })
  created_at!: number;

  constructor(data?: Partial<Tokens>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
