import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Token Detail API (e2e)", () => {
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

  it("/tokens/:address/detail (GET)", async () => {
    const res = await request(app.getHttpServer()).get(
      "/tokens/0xtrump123/detail",
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("current_info");
  });
});
