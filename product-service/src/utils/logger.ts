// src/utils/logger.ts
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf((info) => {
      const { timestamp, level, message, stack, ...meta } = info;
      
      // Build base log message
      let logMessage = `${timestamp} [PRODUCT-SERVICE][${level.toUpperCase()}]: ${message}`;
      
      // Add metadata if present (filter out symbols and empty objects)
      const cleanMeta = { ...meta };
      delete cleanMeta[Symbol.for('level')];
      delete cleanMeta[Symbol.for('message')];
      delete cleanMeta[Symbol.for('splat')];
      
      const metaKeys = Object.keys(cleanMeta);
      if (metaKeys.length > 0) {
        // Pretty print metadata
        logMessage += `\n  ${JSON.stringify(cleanMeta, null, 2)}`;
      }
      
      // Add stack trace if present (for errors)
      if (stack) {
        logMessage += `\n${stack}`;
      }
      
      return logMessage;
    }),
    // Apply colorization AFTER printf (so colors work in console)
    winston.format.colorize({ all: true })
  ),
  transports: [
    new winston.transports.Console({
      // Human-readable for development
    })
  ]
});

// Helper to properly serialize errors
export const logError = (message: string, error: Error | unknown, meta?: Record<string, any>) => {
  if (error instanceof Error) {
    // Extract known Error fields and collect any custom properties to avoid duplicate keys
    const { name, message: errMessage, stack, ...customProps } = error as any;
    logger.error(message, {
      error: {
        name,
        message: errMessage,
        stack,
        ...customProps // Spread any custom properties
      },
      ...meta
    });
  } else {
    logger.error(message, {
      error: String(error),
      ...meta
    });
  }
};

export default logger;