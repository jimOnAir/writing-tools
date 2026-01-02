/**
 * Interface for IPC handlers operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IIpcHandlers {
  /**
   * Register all IPC handlers with Electron's ipcMain
   */
  register: () => void;
}
