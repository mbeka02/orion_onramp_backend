import pino from "pino";
import { loggerLevelsSchema } from "../types/logger";
import "dotenv/config";
import postHogLogger, { PostHogEventTypes } from "./posthog";

const parsed = loggerLevelsSchema.safeParse(process.env);
if (parsed.error) {
    throw new Error("Invalid setup error, set NODE_ENV and LOG_LEVEL to one of the correct values");
}
const env = parsed.data;

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  fatal(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  trace(message: string, context?: LogContext): void;
  child(bindings: Record<string, unknown>): Logger;
}

const redactPaths = [
  "password",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.authorization",
  "*.secret",
  "*.apiKey",
  "*.privateKey",
  "*.creditCard",
  "*.ssn",
  "*.socialSecurityNumber",
];

const pinoLogger = pino({
  level: env.LOG_LEVEL || "info",
  redact: {
    paths: redactPaths,
    censor: "**REDACTED**",
  },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_version: process.version,
      };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  transport: env.NODE_ENV === "development" || env.NODE_ENV === 'test'
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

// Application logger wrapper
const logger: Logger = {
  fatal(message: string, context?: LogContext) {
    pinoLogger.fatal(context, message);
    if (env.NODE_ENV === 'production') {
      postHogLogger.sendEvent(PostHogEventTypes.ERROR, message, {context});
    }
  },
  error(message: string, context?: LogContext) {
    pinoLogger.error(context, message);
    if (env.NODE_ENV === "production") {
      postHogLogger.sendEvent(PostHogEventTypes.ERROR, message, {context});
    }
  },
  warn(message: string, context?: LogContext) {
    pinoLogger.warn(context, message);
    if (env.NODE_ENV === "production") {
      postHogLogger.sendEvent(PostHogEventTypes.WARNING, message, {context});
    }
  },
  info(message: string, context?: LogContext) {
    pinoLogger.info(context, message);
  },
  debug(message: string, context?: LogContext) {
    pinoLogger.debug(context, message);
  },
  trace(message: string, context?: LogContext) {
    pinoLogger.trace(context, message);
  },
  child(bindings: Record<string, unknown>) {
    return pinoLogger.child(bindings);
  },
};

export default logger;