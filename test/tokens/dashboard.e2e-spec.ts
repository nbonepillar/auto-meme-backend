import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Dashboard API (e2e)", () => {
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

  it("/tokens/dashboard (GET)", async () => {
    const res = await request(app.getHttpServer()).get("/tokens/dashboard");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("tokens_new");
  });
});
