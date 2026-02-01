export interface IDbWatcherService {
  on: (event: string | symbol, listener: (...args: unknown[]) => void) => this;
}
