import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("User API (e2e)", () => {
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

  it("/users/userinfo (GET)", async () => {
    const res = await request(app.getHttpServer()).get(
      "/users/userinfo?user_id=0xuser123",
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email_address");
  });

  it("/users/signin (POST) - signup + signin", async () => {
    const email = `newuser_${Date.now()}@example.com`;
    const res = await request(app.getHttpServer())
      .post("/users/signin")
      .send({ email_address: email });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("access_token");
    expect(res.body.user.email_address).toBe(email);
  });

  it("/users/signin (POST) - signin existing user", async () => {
    const email = "user@example.com";
    const res = await request(app.getHttpServer())
      .post("/users/signin")
      .send({ email_address: email });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("access_token");
    expect(res.body.user.email_address).toBe(email);
  });

  it("/users/signin (POST) - missing email", async () => {
    const res = await request(app.getHttpServer())
      .post("/users/signin")
      .send({});
    expect(res.status).toBe(400);
  });
});
