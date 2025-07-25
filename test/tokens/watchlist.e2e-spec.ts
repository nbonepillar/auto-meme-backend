import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Watchlist API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/tokens/watchlist (GET)", async () => {
    const res = await request(app.getHttpServer()).get("/tokens/watchlist");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("/tokens/watchlist (POST/DELETE)", async () => {
    const address = "0xtestadd";
    const postRes = await request(app.getHttpServer())
      .post("/tokens/watchlist")
      .send({ address });
    expect(postRes.status).toBe(201);
    expect(postRes.body).toHaveProperty("success", true);
    const delRes = await request(app.getHttpServer())
      .delete("/tokens/watchlist")
      .send({ address });
    expect(delRes.status).toBe(200);
    expect(delRes.body).toHaveProperty("success");
  });
});
