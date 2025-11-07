/**
 * Log level types
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface definition
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
  setEnvironment(env: 'development' | 'production' | 'test'): void;
}
