/**
 * Log level types
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface definition
 */
export interface ILogger {
  debug: (message: string, ...args: string[]) => void;
  error: (message: string, ...args: string[]) => void;
  info: (message: string, ...args: string[]) => void;
  setEnvironment: (env: 'development' | 'production' | 'test') => void;
  setLevel: (level: LogLevel) => void;
  warn: (message: string, ...args: string[]) => void;
}
