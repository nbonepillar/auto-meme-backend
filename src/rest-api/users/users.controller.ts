import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import { UserService } from "./users.service";
import { ERROR_CODES } from "../../common/error-codes";
import { userMockId, userMockData, UserInfo } from "../../mock/user.mock";

class SigninDto {
  email_address!: string;
}

/**
 * Controller for user-related endpoints such as sign-in and user info retrieval.
 */
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Signs in a user and returns user info and JWT token.
   *
   * @param dto - Object containing the user's email address.
   * @returns User entity and JWT access token.
   */
  @Post("signin")
  async signin(@Body() body: any) {
    const emailAddress = body.email_address;
    const password = body.password;
    const fingerprint = body.fingerprint;
    const referralId = body.referral_id;
    return this.userService.signin(
      emailAddress,
      password,
      fingerprint,
      referralId,
    );
  }

  /**
   * Retrieves user information by user_id (mocked).
   *
   * @param user_id - The user ID to look up.
   * @returns User info object or error code if not found.
   */
  @Post("userinfo")
  async getUserinfo(@Body("user_id") user_id: string) {
    if (user_id !== userMockId) {
      return {
        error: ERROR_CODES.USER_NOT_FOUND.code,
        message: ERROR_CODES.USER_NOT_FOUND.text,
      };
    }
    return userMockData;
  }

  @Post("emailverify")
  async emailverify(@Body() body: any) {
    const email_address = body.email_address;
    const verification_code = body.verification_code;

    return this.userService.verifyEmailCode(email_address, verification_code);
  }

  @Get("telegraminfo")
  async getUserInfoByTgId(
    @Query("address") address: string,
    @Query("tg_id") tg_id: string,
  ) {
    return this.userService.searchUserInfoByTgId(address, tg_id);
  }

  @Post("createUserWithTgId")
  async createUserWithTgId(@Body() body: any) {
    return this.userService.createUserWithTgId(body.tg_id);
  }

  @Post("updateUserInfo")
  async updateUserInfoByTgId(@Body() body: any) {
    return this.userService.updateUserInfoByTgId(
      body.email_address,
      body.tg_id,
    );
  }
}
