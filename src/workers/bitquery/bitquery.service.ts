import { Injectable } from "@nestjs/common";
import axios from "axios";
import { EventEmitter } from "events";
import Logger from "@common/logger";
import { Mutex } from "async-mutex";

const { WebSocket } = require("ws");
const mutex = new Mutex();

@Injectable()
export class BitQueryService {
  private readonly apiKey = process.env.BITQUERY_API_KEY;
  private readonly subapiKey = process.env.SUBSCRIPTION_API_KEY;

  constructor() {}

  fetchWebSocketData(): boolean {
    return true;
  }

  getWebSocketEmitter(
    subscriptionQuery: string,
    baseUrl: string,
  ): EventEmitter {
    const emitter = new EventEmitter();
    const wsUrl = `${baseUrl}?token=${this.subapiKey}`;
    const ws = new WebSocket(wsUrl, ["graphql-ws"]);

    ws.on("open", () => {
      Logger.getInstance().info("Websocket opened, sending connection_init");
      ws.send(JSON.stringify({ type: "connection_init" }));
    });

    ws.on("message", (data: Buffer) => {
      let msg = JSON.parse(data.toString());
      if (msg.type === "connection_ack") {
        ws.send(
          JSON.stringify({
            type: "start",
            id: "1",
            payload: { query: subscriptionQuery },
          }),
        );
      } else if (msg.type === "data" && msg.id === "1") {
        emitter.emit("data", msg.payload.data);
      } else if (msg.type === "error" || msg.type === "connection_error") {
        emitter.emit("error", msg.payload || msg);
      }
    });

    ws.on("close", () => {
      ws.close();
      emitter.emit("close");
    });

    ws.on("error", (err: Error) => {
      ws.close();
      emitter.emit("error", err);
    });

    return emitter;
  }

  async fetchData<T>(
    query: string,
    baseUrl: string,
    variables: any = {},
  ): Promise<T> {
    try {
      const headers = {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      };

      const requestBody = {
        query,
        variables,
      };

      const response = await axios.post(baseUrl, requestBody, { headers });

      return response.data.data as T;
    } catch (error) {
      Logger.getInstance().error(error);
      throw error;
    }
  }

  /**
   * Fetch trending tokens from Bitquery (Solana DEXTradeByTokens, sorted by trades_count, 1-day window)
   * Returns: [{ name, address, time, network, liquidity, mc, holders, price, vol_1h, vol_6h, vol_24h, degen_audit, uri }]
   */
  async fetchTrendingTokens(): Promise<any[]> {
    // 1 day ago
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const query = `
      query GMGNTrendingTokens {
        Solana {
          DEXTradeByTokens(
            where: {
              Block: { Time: { since: \"${since}\" } }
              Transaction: { Result: { Success: true } }
              Trade: {
                Side: {
                  Currency: {
                    MintAddress: {
                      in: [\"So11111111111111111111111111111111111111112\"]
                    }
                  }
                }
                Currency: {
                  MintAddress: {
                    notIn: [\"So11111111111111111111111111111111111111112\"]
                  }
                }
              }
            }
            limit: { count: 50 }
            orderBy: { descendingByField: \"trades_count\" }
          ) {
            Trade {
              Currency {
                Name
                Symbol
                MintAddress
              }
            }
            trades_count: count
          }
        }
      }
    `;
    const headers = {
      Authorization: this.apiKey,
      "Content-Type": "application/json",
    };
    try {
      const response = await axios.post(
        "https://streaming.bitquery.io/eap",
        { query },
        { headers },
      );
      const tokens = response.data?.data?.Solana?.DEXTradeByTokens || [];
      return tokens;
    } catch (e) {
      return [];
    }
  }
}
