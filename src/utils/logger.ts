import { ILogger } from "../interfaces/ILogger";

/**
 * Log level types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger implementation
 */
export class Logger implements ILogger {
  private currentLevel: LogLevel = 'debug';
  private currentEnvironment: 'development' | 'production' | 'test' = 'development';

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Set the environment for filtering
   */
  setEnvironment(env: 'development' | 'production' | 'test'): void {
    this.currentEnvironment = env;
  }

  /**
   * Get the minimum level to log based on environment
   */
  private getMinLevel(): LogLevel {
    switch (this.currentEnvironment) {
      case 'production':
        return 'info';
      case 'test':
        return 'debug';
      default: // development
        return 'debug';
    }
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const minLevel = this.getMinLevel();

    const levelOrder = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3
    };

    return levelOrder[level] >= levelOrder[minLevel];
  }

  /**
   * Format a log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ...args));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

// Set default environment from process.env.NODE_ENV or default to 'development'
if (typeof process !== 'undefined' && process.env) {
  const env = process.env.NODE_ENV as 'development' | 'production' | 'test';
  if (env === 'development' || env === 'production' || env === 'test') {
    logger.setEnvironment(env);
  }
}
