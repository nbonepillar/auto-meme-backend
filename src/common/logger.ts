import winston from "winston";

const logFormat = winston.format.printf(
  ({ timestamp, level, message, stack }) => {
    const errorStack = stack ? `\n${stack}` : "";
    return `${timestamp} ${level}: ${message} ${errorStack}`;
  },
);

class Logger {
  private static instance: winston.Logger;

  private constructor() {}

  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        format: winston.format.combine(winston.format.timestamp(), logFormat),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(winston.format.simple()),
          }),
          new winston.transports.File({ filename: "logfile.log" }),
        ],
      });
    }
    return Logger.instance;
  }
}

export default Logger;
