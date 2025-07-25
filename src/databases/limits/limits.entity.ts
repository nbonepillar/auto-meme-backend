import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("limits")
export class Limits {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  network!: string; // sol, eth, bsc

  @Column()
  wallet_address!: string;

  @Column()
  token_address!: string;

  @Column()
  amount_in!: string;

  @Column({ nullable: true })
  status?: string;

  @Column({ nullable: true })
  message?: string;

  @CreateDateColumn()
  timestamp!: number;

  @Column({ nullable: true })
  mc?: string;

  @Column({ type: "float", nullable: true })
  order_price?: number;

  @Column()
  action!: string;

  @Column({ nullable: true })
  error?: string;

  @Column({ nullable: true })
  extra?: string;

  @Column({ nullable: true })
  order_type?: string;

  @Column({ nullable: true })
  parent_position_id?: string; // original position id for TP/SL
}
