import { ElectronIpcAdapter, type IIpcAdapter } from '../ipc';

/**
 * Bootstrap class for initializing renderer-side services
 * Creates and wires up domain services with infrastructure dependencies
 */
export class RendererBootstrap {
  private readonly ipcAdapter: IIpcAdapter;

  public constructor(ipcAdapter?: IIpcAdapter) {
    this.ipcAdapter = ipcAdapter ?? new ElectronIpcAdapter();
  }

  /**
   * Get the IPC adapter instance
   */
  public getIpcAdapter(): IIpcAdapter {
    return this.ipcAdapter;
  }

  /**
   * Initialize all renderer-side services
   * This will be expanded as domain services are created
   */
  public initialize(): void {
    // Services will be initialized here as they are created
    // For now, this is a placeholder that ensures the bootstrap pattern is in place
  }
}
