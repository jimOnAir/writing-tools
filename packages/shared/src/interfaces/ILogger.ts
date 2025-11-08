/**
 * Log level types
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface definition
 */
export interface ILogger {
  debug: (message: string, ...args: string[]) => void;
  info: (message: string, ...args: string[]) => void;
  warn: (message: string, ...args: string[]) => void;
  error: (message: string, ...args: string[]) => void;
  setLevel: (level: LogLevel) => void;
  setEnvironment: (env: 'development' | 'production' | 'test') => void;
}
