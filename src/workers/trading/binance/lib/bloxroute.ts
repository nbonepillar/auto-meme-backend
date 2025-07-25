import {
  BLOXROUTE_API_KEY,
  BLOXROUTE_BSC_BUNDLE_URL,
} from "@workers/trading/binance/lib/constants";
import { getCurrentBlockNumber } from "@workers/trading/binance/lib/helper-contracts";
import Logger from "@common/logger";

export const sendBundleTxs = async (txs: string[]) => {
  const currentBlock = await getCurrentBlockNumber();
  const targetBlockHex = `0x${(currentBlock + BigInt(2)).toString(16)}`;

  const bundlePayload = {
    id: "1",
    method: "blxr_submit_bundle",
    // method: "blxr_simulate_bundle",
    params: {
      transaction: txs,
      blockchain_network: "BSC-Mainnet",
      block_number: targetBlockHex,
      mev_builders: {
        all: "",
      },
    },
  };

  const response = await fetch(BLOXROUTE_BSC_BUNDLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${BLOXROUTE_API_KEY}`,
    },
    body: JSON.stringify(bundlePayload),
  });
  const data = await response.json();
  Logger.getInstance().info("data:", data);

  return data;
};

export const sendBatchTxs = async (txs: string[]) => {
  const currentBlock = await getCurrentBlockNumber();
  const targetBlockHex = `0x${(currentBlock + BigInt(2)).toString(16)}`;

  const bundlePayload = {
    id: "1",
    method: "blxr_batch_tx",
    // method: "blxr_simulate_bundle",
    params: {
      transactions: txs,
      blockchain_network: "BSC-Mainnet",
    },
  };

  const response = await fetch(BLOXROUTE_BSC_BUNDLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${BLOXROUTE_API_KEY}`,
    },
    body: JSON.stringify(bundlePayload),
  });
  const data = await response.json();
  Logger.getInstance().info("data:", data);

  return data;
};

export const senPrivateTxs = async (tx: string) => {
  const txPayload = {
    id: "1",
    method: "bsc_private_tx",
    params: {
      transaction: tx,
    },
  };

  const response = await fetch(BLOXROUTE_BSC_BUNDLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${BLOXROUTE_API_KEY}`,
    },
    body: JSON.stringify(txPayload),
  });
  const data = await response.json();
  Logger.getInstance().info("data:", data);

  return data;
};
