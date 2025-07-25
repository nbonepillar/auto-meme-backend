import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Search API (e2e)", () => {
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

  it("/tokens/search (GET)", async () => {
    const res = await request(app.getHttpServer()).get(
      "/tokens/search?query=trump",
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("searched_tokens");
  });
});
