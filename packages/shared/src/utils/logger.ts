import type { ILogger } from '../interfaces/ILogger';

/**
 * Log level types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger implementation
 */
export class Logger implements ILogger {
  private currentEnvironment: 'development' | 'production' | 'test' = 'development';
  private currentLevel: LogLevel | null = null;

  /**
   * Log debug message
   */
  public debug(message: string, ...args: string[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  /**
   * Log error message
   */
  public error(message: string, ...args: string[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  /**
   * Log info message
   */
  public info(message: string, ...args: string[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ...args));
    }
  }

  /**
   * Set the environment for filtering
   */
  public setEnvironment(env: 'development' | 'production' | 'test'): void {
    this.currentEnvironment = env;
    // Reset explicit level so environment defaults are used
    this.currentLevel = null;
  }

  /**
   * Set the minimum log level
   */
  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Log warning message
   */
  public warn(message: string, ...args: string[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  /**
   * Format a log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, ...args: string[]): string {
    const timestamp = new Date().toISOString();
    // For proper format string support (like %s, %d, %o), we need to process
    // the message with the arguments before passing to console
    let formattedMessage = message;

    // If there are arguments, replace format placeholders in the message
    if (args.length > 0) {
      // Create a copy of args to avoid modifying the original
      const argsCopy = [...args];
      // Using replace with regex for pattern matching (%s|%d|%o) - replaceAll doesn't support regex
      formattedMessage = message.replace(/%s|%d|%o/g, (match) => {
        if (argsCopy.length > 0) {
          const arg = argsCopy.shift();

          return String(arg);
        }

        return match;
      });
    }

    return `[${timestamp}] ${level.toUpperCase()}: ${formattedMessage}`;
  }

  /**
   * Get the minimum level to log based on environment
   */
  private getMinLevel(): LogLevel {
    // If explicit level is set, use it; otherwise derive from environment
    if (this.currentLevel !== null) {
      return this.currentLevel;
    }

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

    // Note: levelOrder maintains logical ordering by severity, not alphabetical
    const levelOrder = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3,
    };

    return levelOrder[level] >= levelOrder[minLevel];
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
