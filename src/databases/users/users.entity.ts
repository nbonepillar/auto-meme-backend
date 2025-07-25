import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  email_address!: string;

  @Column({ unique: true })
  user_id!: string;

  @Column({ nullable: true })
  image_url!: string;

  @Column({ nullable: true })
  last_login!: Date;

  @Column({ nullable: true })
  password!: string;

  @Column({ nullable: true })
  fingerprint!: string;

  @Column({ nullable: true })
  refresh_token!: string;

  @Column({ nullable: true })
  referral_id!: string;

  @Column({ nullable: true })
  tg_id!: string;

  @CreateDateColumn()
  created_at!: Date;
}
