import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("referrals")
export class Referral {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  user_id!: string;

  @Column()
  friend_id!: string;

  @CreateDateColumn()
  created_at!: Date;
}
