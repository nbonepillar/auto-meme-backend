import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  user_id!: string;

  @Column()
  address!: string;

  @Column()
  network!: string;

  @Column()
  is_default!: boolean;

  @Column({ nullable: true })
  private_key!: string;
}
