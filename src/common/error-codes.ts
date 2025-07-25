export interface ERROR_CODE_ITEM {
  code: string;
  text: string;
}

export const ERROR_CODES = {
  UNKNOWN: {
    code: "unknown",
    text: "Unknown error",
  },
  VALIDATION: {
    code: "validation",
    text: "Validation error",
  },
  AUTH: {
    code: "auth",
    text: "Authorization error",
  },
  NO_ACCESS: {
    code: "no_access",
    text: "No access to resource",
  },
  NOT_FOUND: {
    code: "not_found",
    text: "Resource not found",
  },
  NOT_IMPLEMENTED: (method: string) => ({
    code: "not_implemented",
    text: `Method not implemented: ${method}`,
  }),

  // Token
  NOT_FOUND_TOKEN: {
    code: "not_found_token",
    text: "Token not found",
  },
  INVALID_TOKEN_ADDRESS: {
    code: "invalid_token_address",
    text: "Invalid token address",
  },
  INVALID_SEARCH_QUERY: {
    code: "invalid_search_query",
    text: "Invalid search query",
  },

  // Watchlist
  ALREADY_IN_WATCHLIST: {
    code: "already_in_watchlist",
    text: "Token already in watchlist",
  },
  NOT_IN_WATCHLIST: {
    code: "not_in_watchlist",
    text: "Token not in watchlist",
  },
  INVALID_WATCHLIST_ADDRESS: {
    code: "invalid_watchlist_address",
    text: "Invalid address for watchlist",
  },

  
  // User Signin/Signup/Registration
  USER_NOT_FOUND: {
    code: "not_found_user",
    text: "User not found",
  },
  INVALID_USER_ID: {
    code: "invalid_user_id",
    text: "Invalid user id",
  },
  USER_ALREADY_EXISTS: {
    code: "user_already_exists",
    text: "User already exists",
  },
  USER_CREATION_FAILED: {
    code: "user_creation_failed",
    text: "User creation failed",
  },
  INVALID_EMAIL_FORMAT: {
    code: "invalid_email_format",
    text: "Invalid email format",
  },
  WEAK_PASSWORD: {
    code: "weak_password",
    text: "Password does not meet security requirements",
  },
  EMAIL_ALREADY_REGISTERED: {
    code: "email_already_registered",
    text: "Email address is already registered",
  },
  MISSING_SIGNUP_FIELDS: {
    code: "missing_signup_fields",
    text: "Required signup fields are missing",
  },
  PASSWORD_MISMATCH: {
    code: "password_mismatch",
    text: "Password is incorrect",
  },
  VERIFICATION_CODE_EXPIRED: {
    code: "verification_code_expired",
    text: "Verification code expired or not found",
  },
  VERIFICATION_CODE_MISMATCH: {
    code: "verification_code_mismatch",
    text: "Verification code does not match",
  },
  USER_REGISTERED: {
    code: "user_registered",
    text: "User registered successfully",
  },
  USER_LOGIN_SUCCESS: {
    code: "user_login_success",
    text: "User Log in successful",
  },
  VERIFICATION_CODE_SENT: {
    code: "verification_code_sent",
    text: "Verification code sent to email.",
  },

  // Wallet
  NOT_FOUND_WALLET: {
    code: "not_found_wallet",
    text: "Wallet not found",
  },
  INVALID_WALLET_ADDRESS: {
    code: "invalid_wallet_address",
    text: "Invalid wallet address",
  },

  // Referral/PNL/History
  NOT_FOUND_REFERRAL: {
    code: "not_found_referral",
    text: "Referral info not found",
  },
  NOT_FOUND_HISTORY: {
    code: "not_found_history",
    text: "History not found",
  },
  NOT_FOUND_PNL: {
    code: "not_found_pnl",
    text: "PNL info not found",
  },
};
