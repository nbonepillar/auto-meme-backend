import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WsAdapter } from "@nestjs/platform-ws";

async function bootstrap() {
  const App_Module = await NestFactory.create(AppModule);
  App_Module.useWebSocketAdapter(new WsAdapter(App_Module));
  App_Module.enableCors();
  await App_Module.listen(3000);
}
// ** Because of unknown error in code, service is stopped when error occurs, so handled error in global scope.

// Enable long stack traces in development
if (process.env.NODE_ENV === "development") {
  Error.stackTraceLimit = Infinity;
  // Optional: Use longjohn for even better async stack traces
  // npm install longjohn
  // require('longjohn');
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("=== Unhandled Rejection ===");
  console.error("Promise:", promise);
  console.error("Reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Log to your monitoring system
  // Consider graceful shutdown
});

// Handle SIGTERM gracefully
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  // Close database connections, Redis, etc.
  process.exit(0);
});

bootstrap();
