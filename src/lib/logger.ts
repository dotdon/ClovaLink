/**
 * Centralized logging system using Pino
 * Provides structured logging with appropriate levels and formatting
 */

import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create base logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: LOG_LEVEL,
  // Pretty print in development, JSON in production
  ...(NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
      }),
};

// Create base logger
const baseLogger = pino(loggerConfig);

/**
 * Create a child logger with context
 */
export function createLogger(context: string) {
  return baseLogger.child({ context });
}

/**
 * Default logger instance
 */
export const logger = baseLogger;

/**
 * Log levels for easy reference
 */
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

/**
 * Helper function to log HTTP requests
 */
export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  userId?: string
) {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  
  logger[level]({
    type: 'http',
    method,
    url,
    status,
    duration: `${duration}ms`,
    userId,
  });
}

/**
 * Helper function to log database queries (for debugging)
 */
export function logQuery(operation: string, model: string, duration: number) {
  logger.debug({
    type: 'database',
    operation,
    model,
    duration: `${duration}ms`,
  });
}

/**
 * Helper function to log errors with context
 */
export function logError(
  error: Error | unknown,
  context?: Record<string, any>
) {
  const errorObj = error instanceof Error
    ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    : { error: String(error) };

  logger.error({
    type: 'error',
    ...errorObj,
    ...context,
  });
}

/**
 * Helper function to log security events
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>
) {
  logger.warn({
    type: 'security',
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper function to log activity events
 */
export function logActivity(
  action: string,
  userId: string,
  details?: Record<string, any>
) {
  logger.info({
    type: 'activity',
    action,
    userId,
    ...details,
  });
}

export default logger;

