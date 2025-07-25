import fs from "fs";
import { Wallet } from "ethers";
import crypto from "crypto";
import { generateEthAddressFromPrivateKey } from "@common/chain/chain.ethereum";
import { generateSolanaAddressFromPrivateKey } from "@common/chain/chain.solana";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { BadRequestException } from "@nestjs/common";

export function getDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  return formattedDateTime;
}

export function getBondingCurveProgress(quoteAmount: number | undefined) {
  if (quoteAmount !== undefined) {
    const percentage = (quoteAmount / 85) * 100;
    if (percentage < 20) return 0; // new creation
    if (percentage < 100) return 1; // completing
    return 2; // completed
  }
}

export const FILE_PATH = "myFile.txt";
export function writeMessageToFile(message: string): void {
  fs.appendFile(FILE_PATH, JSON.stringify(message, null, 2), (err) => {
    if (err) {
      return;
    }
  });
  fs.appendFile(
    FILE_PATH,
    getDateTime() + "----------------------END-----------------------",
    (err) => {
      if (err) {
        return;
      }
    },
  );
}

export function generateUserIdFromEmail(email: string): string {
  const hash = crypto.createHash("sha256").update(email).digest();
  return hash.toString("base64url");
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function comparePassword(raw: string, hashed: string): boolean {
  return hashPassword(raw) === hashed;
}

export function getTimeStampFromIso8601(iso8601: string): number {
  const date = new Date(iso8601);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid ISO 8601 date string");
  }
  return Math.floor(date.getTime() / 1000);
}

export function getCurrentTimeStamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function getISO8601FromTimeStamp(timeStamp: number | string): string {
  if (!timeStamp) return "";
  let ts = Number(timeStamp);
  if (isNaN(ts)) return "";
  // if timestamp is second unit
  if (ts < 1e12) ts = ts * 1000;
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function normalizeHexPrefix(key: string): string {
  return key.startsWith("0x") ? key : "0x" + key;
}

/**
 * Generate wallet address for any supported network
 * @param network - Network type (eth, bsc, sol)
 * @param privateKey - Private key
 * @returns wallet address
 */
export function generateAddressFromPrivateKey(
  network: string,
  privateKey: string,
): string {
  switch (network.toLowerCase()) {
    case "eth":
    case "bsc":
      return generateEthAddressFromPrivateKey(privateKey);

    case "sol":
      return generateSolanaAddressFromPrivateKey(privateKey);

    default:
      throw new BadRequestException(
        `Unsupported network: ${network}. Supported networks: eth, bsc, sol`,
      );
  }
}

export function generateReferralId(): string {
  // 8 random alphanumeric characters + current timestamp (base36)
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase();
  return `${randomPart}${timePart}`;
}
