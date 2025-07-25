// Root application module. All feature modules should be imported from src/modules/.
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@nestjs-modules/ioredis";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TokenModule } from "@rest-api/tokens/tokens.module";
import { ManRedisModule } from "@redis/redis.module";
import { CompletedListService } from "@schedule/completed-list.service";
import { WsApiGateway } from "@websocket/websocket.service";
import { WorkerModule } from "@workers/worker.module";
import { UserModule } from "@databases/users/users.module";
import { WalletsModule } from "@rest-api/wallets/wallets.module";
import { LimitTriggerModule } from "@workers/limit-trigger/limit-trigger.module";

@Module({
  imports: [
    WalletsModule,
    ConfigModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
      maxListeners: 20,
    }),
    RedisModule.forRoot({
      type: "single",
      url: "redis://localhost:6379", //process.env.REDIS_URL,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: true,
      autoLoadEntities: true,
      logging: false,
    }),
    UserModule,
    TokenModule,
    // FriendModule,
    // HistoryModule,
    // PnlModule,
    // TokenPriceHistoryModule,
    // TokenHoldersModule,
    // TrendingModule,
    // Feature modules will be imported here (e.g., UserModule, TokenModule, etc.)
    ManRedisModule,
    WorkerModule,
    LimitTriggerModule,
  ],
  providers: [CompletedListService, WsApiGateway],
})
export class AppModule {}
