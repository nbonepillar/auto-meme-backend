import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@databases/users/users.entity";
import { v4 as uuidv4 } from "uuid";
import { JwtService } from "@nestjs/jwt";
import {
  generateUserIdFromEmail,
  hashPassword,
  comparePassword,
  generateReferralId,
} from "@common/utils";
import { Wallet } from "@databases/wallets/wallets.entity";
import { Resend } from "resend";
import Redis from "ioredis";
import { ERROR_CODES } from "@common/error-codes";
import Logger from "@common/logger";
import { Referral } from "@databases/referrals/referrals.entity";
import { createEvmWallet } from "@common/chain/chain.ethereum";
import { createSolanaWallet } from "@common/chain/chain.solana";

/**
 * Service for managing user authentication and persistence.
 * Handles user sign-in, creation, and JWT token issuance.
 */
@Injectable()
export class UserService {
  resend: Resend;
  private redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  });
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Signs in a user by email address. Creates a new user if not found.
   * Issues a JWT access token for the user.
   *
   * @param email_address - The email address of the user to sign in.
   * @returns An object containing the user entity and a JWT access token.
   * @throws Error if user creation fails.
   */
  async signin(
    email_address: string,
    password?: string,
    fingerprint?: string,
    referralId?: string,
  ): Promise<any> {
    let user = await this.userRepository.findOne({
      where: { email_address, fingerprint },
    });
    if (user && password && !comparePassword(password, user.password)) {
      return {
        status: 202,
        message: ERROR_CODES.PASSWORD_MISMATCH.text,
      };
    }
    if (!email_address || typeof email_address !== "string") {
      return {
        status: 400,
        message: ERROR_CODES.VALIDATION.text,
        code: ERROR_CODES.VALIDATION.code,
        detail: "Invalid or missing email_address",
      };
    }
    if (user && password && !comparePassword(password, user.password)) {
      return {
        status: 401,
        message: ERROR_CODES.AUTH.text,
        code: ERROR_CODES.AUTH.code,
        detail: ERROR_CODES.PASSWORD_MISMATCH.text,
      };
    }
    try {
      if (!user) {
        const verificationCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();
        await this.resend.emails.send({
          from: "The Thing <no-reply@privateai.com>",
          to: email_address,
          subject: "Your Verification Code",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 8px #f0f0f0; padding: 32px 24px; background: #fff;">
              <div style="text-align: center;">
                <img src='https://harlequin-near-antlion-574.mypinata.cloud/ipfs/bafkreih2cii54umpoej2iuce55mlnhfvvrh7jrc5wi2etlw4zuaihl7ofq' alt='The Thing' style='height: 48px; margin-bottom: 16px;' />
                <h2 style="color: #b44cff; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">THE THING</h2>
              </div>
              <h3 style="text-align: center; color: #222; margin: 24px 0 8px 0;">Your <span style="color: #b44cff;">The Thing</span> verification code</h3>
              <div style="font-size: 2.5rem; font-weight: bold; letter-spacing: 16px; text-align: center; margin: 24px 0; color: #222;">${verificationCode}</div>
              <div style="text-align: center; color: #888; font-size: 0.95rem; margin-bottom: 16px;">
                ${new Date().toUTCString()}<br/>
                This is a one-time code that expires in 5 minutes
              </div>
              <div style="background: #f8f8ff; border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #b44cff; font-weight: bold; text-align: center;">
                Do not share your code with anyone<br/>
                <span style="color: #222; font-weight: normal;">The Thing team will never ask for it</span>
              </div>
              <div style="color: #888; font-size: 0.9rem; text-align: center; margin-top: 24px;">
                If you didn't attempt to sign up but received this email, apologies and please ignore. If you are concerned about your account's safety, <a href="https://memething.com/contact" style="color: #b44cff; text-decoration: underline;">we're here to help</a>.<br/><br/>
                Service powered by <b>The Thing</b><br/>
                Visit us at <a href="https://memething.com" style="color: #b44cff; text-decoration: underline;">memething.com</a>
              </div>
            </div>
          `,
        });

        Logger.getInstance().info("Verification Code : ", verificationCode);
        const expiresAt = Date.now() + 5 * 60 * 1000;
        const hashedPassword = password ? hashPassword(password) : undefined;
        try {
          await this.redis.set(
            `verify:${email_address}`,
            JSON.stringify({
              code: verificationCode,
              expiresAt,
              password: hashedPassword,
              fingerprint,
              referralId,
            }),
            "EX",
            5 * 60,
          );
        } catch (e) {
          console.error("Error setting verification code in Redis: ", e);
        }
        return {
          status: 201,
          message: ERROR_CODES.VERIFICATION_CODE_SENT.text,
          needs_verification: true,
        };
      }

      let wallets = await this.walletRepository.find({
        where: { user_id: user.user_id },
      });
      if (wallets === undefined || wallets === null || wallets.length === 0) {
        wallets = await this.createWallets(user.user_id);
      }

      // TODO: Security Vulnerabilities
      // Must return exclude wallet private key and user_id

      const payload = { sub: user.id, email: user.email_address };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign({
        ...payload,
        type: "refresh",
      });
      return {
        status: 200,
        message: ERROR_CODES.USER_LOGIN_SUCCESS.text,
        user_id: user.user_id,
        wallet_address: wallets,
        token: { access_token, refresh_token },
        needs_verification: false,
      };
    } catch (err) {
      return {
        status: 500,
        message: ERROR_CODES.UNKNOWN.text,
        code: ERROR_CODES.UNKNOWN.code,
        detail: "Internal server error",
      };
    }
  }

  async verifyEmailCode(email_address: string, verification_code: string) {
    const redisKey = `verify:${email_address}`;
    const stored = await this.redis.get(redisKey);
    if (!stored) {
      return {
        status: 201,
        message: ERROR_CODES.VERIFICATION_CODE_EXPIRED.text,
      };
    }

    const { code, expiresAt, password, fingerprint, referralId } =
      JSON.parse(stored);
    if (code !== verification_code) {
      return {
        status: 202,
        message: ERROR_CODES.VERIFICATION_CODE_MISMATCH.text,
      };
    }
    if (Date.now() > expiresAt) {
      return {
        status: 203,
        message: ERROR_CODES.VERIFICATION_CODE_EXPIRED.text,
      };
    }

    // TODO: Check user exists, if true check fingerprint, else create user

    const user = this.userRepository.create({
      email_address,
      user_id: generateUserIdFromEmail(email_address),
      image_url: `https://www.gravatar.com/avatar/${uuidv4()}?d=mp`,
      password,
      fingerprint,
      referral_id: generateReferralId(),
    });

    const referred_user = await this.userRepository.findOne({
      where: { referral_id: referralId },
    });

    if (referred_user) {
      this.referralRepository.create({
        user_id: referred_user.user_id,
        friend_id: user.referral_id,
        created_at: new Date(),
      });
    }

    let wallets = await this.walletRepository.find({
      where: { user_id: user.user_id },
    });
    if (wallets === undefined || wallets === null || wallets.length === 0) {
      wallets = await this.createWallets(user.user_id);
    }

    const payload = { sub: user.id, email: user.email_address };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign({ ...payload, type: "refresh" });

    try {
      await this.userRepository.save(user);
      await this.redis.del(redisKey);
    } catch (e) {
      console.error("Error saving user: ", e);
    }
    return {
      status: 200,
      message: ERROR_CODES.USER_REGISTERED.text,
      user_id: user.user_id,
      wallet_address: wallets,
      token: { access_token, refresh_token },
    };
  }

  // TODO: Security Vulnerabilities
  // Must return exclude private key and user_id
  async createWallets(user_id: string) {
    const evmWallet = createEvmWallet();
    const solanaWallet = createSolanaWallet();

    let wallets: Wallet[] = [];
    let wallet: Wallet = new Wallet();
    try {
      // Ethereum Wallet
      wallet.address = evmWallet.walletAddress;
      wallet.is_default = true;
      wallet.network = "eth";
      wallet.user_id = user_id;
      wallet.private_key = evmWallet.privateKey;
      await this.walletRepository.save(wallet);
      wallets.push(wallet);

      // BSC
      wallet = new Wallet();
      wallet.address = evmWallet.walletAddress;
      wallet.is_default = true;
      wallet.network = "bsc";
      wallet.user_id = user_id;
      wallet.private_key = evmWallet.privateKey;
      await this.walletRepository.save(wallet);
      wallets.push(wallet);

      // Solana
      wallet = new Wallet();
      wallet.address = solanaWallet.walletAddress;
      wallet.is_default = true;
      wallet.network = "sol";
      wallet.user_id = user_id;
      wallet.private_key = solanaWallet.privateKey;
      await this.walletRepository.save(wallet);
      wallets.push(wallet);
    } catch (e) {
      console.error("Error creating wallets: ", e);
    }

    return wallets;
  }

  async searchUserInfoByTgId(address: string, tg_id: string) {
    const user = await this.userRepository.findOne({
      where: { email_address: address, tg_id },
    });
    if (!user) {
      return { status: 404, message: "User not found" };
    }
    const wallets = await this.walletRepository.find({
      where: { user_id: user.user_id },
    });
    const wallet_info = wallets.map((w) => ({
      address: w.address,
      network: w.network,
      is_default: w.is_default,
    }));

    return {
      status: 200,
      user_id: user.user_id,
      email_address: user.email_address,
      referral_id: user.referral_id,
      wallets: wallet_info,
    };
  }

  async updateUserInfoByTgId(email_address: string, tg_id: string) {
    const user = await this.userRepository.findOne({
      where: { email_address },
    });
    if (!user) {
      return { status: 404, message: "User not found" };
    }
    user.tg_id = tg_id;
    await this.userRepository.save(user);
    return { status: 200, message: "User info updated successfully" };
  }

  async createUserWithTgId(tg_id: string) {
    let user = await this.userRepository.findOne({ where: { tg_id } });
    if (user) {
      return {
        status: 200,
        message: "User already exists",
      };
    } else {
      user = this.userRepository.create({
        user_id: generateUserIdFromEmail(tg_id),
        image_url: `https://www.gravatar.com/avatar/${uuidv4()}?d=mp`,
        tg_id,
        referral_id: generateReferralId(),
      });
      await this.userRepository.save(user);
    }

    let wallets = await this.walletRepository.find({
      where: { user_id: user.user_id },
    });
    if (!wallets || wallets.length === 0) {
      wallets = await this.createWallets(user.user_id);
    }

    const wallet_info = wallets.map((w) => ({
      address: w.address,
      network: w.network,
      is_default: w.is_default,
    }));

    return {
      status: 201,
      user_id: user.user_id,
      tg_id: user.tg_id,
      referral_id: user.referral_id,
      wallets: wallet_info,
    };
  }
}
