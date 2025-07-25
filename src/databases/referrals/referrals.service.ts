import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Referral } from "./referrals.entity";

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
  ) {}

  async getReferralInfo(user_id: string) {
    const user = await this.referralRepository.manager
      .createQueryBuilder()
      .select("user")
      .from("users", "user")
      .where("user.user_id = :user_id", { user_id })
      .getRawOne();

    const referral_id = user?.user_referral_id || "";

    const rows = await this.referralRepository
      .createQueryBuilder("referral")
      .leftJoin("users", "user", "user.referral_id = referral.friend_id")
      .leftJoin("wallets", "wallet", "wallet.user_id = user.user_id")
      .leftJoin(
        "trade_history",
        "trade",
        "trade.sourceWalletAddress = wallet.address AND trade.action = :action",
        { action: "buy" },
      )
      .where("referral.user_id = :user_id", { user_id })
      .select([
        "referral.friend_id AS friend_id",
        "user.user_id AS user_id",
        "user.image_url AS friend_img",
        "wallet.address AS friend_address",
        "trade.sourceChain AS sourceChain",
        "trade.sourceNativeAmount AS sourceNativeAmount",
        "referral.created_at AS joined_at",
      ])
      .getRawMany();

    const friendMap = new Map();
    for (const row of rows) {
      if (!row.friend_id) continue;
      if (!friendMap.has(row.friend_id)) {
        friendMap.set(row.friend_id, {
          friend_id: row.friend_id,
          trading_volume: 0,
          joined_at: row.joined_at ? new Date(row.joined_at).toISOString() : "",
        });
      }
      const entry = friendMap.get(row.friend_id);
      if (row.sourcechain && row.sourcenativeamount) {
        const chain = row.sourcechain.toLowerCase();
        if (chain === "sol")
          entry.trading_volume += Number(row.sourcenativeamount) * 150;
        if (chain === "eth")
          entry.trading_volume += Number(row.sourcenativeamount) * 2500;
        if (chain === "bsc")
          entry.trading_volume += Number(row.sourcenativeamount) * 650;
      }
    }
    const friends_list = Array.from(friendMap.values());

    const invited_cnt = friends_list.length;
    const total_rewards = friends_list.reduce(
      (sum, f) => sum + f.trading_volume * 0.01,
      0,
    );

    return {
      referral_info: {
        referral_id,
        invited_cnt,
        friends_list,
        total_rewards,
      },
    };
  }
}
