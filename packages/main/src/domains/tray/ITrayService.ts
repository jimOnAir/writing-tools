/**
 * Interface for tray service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface ITrayService {
  /**
   * Create and configure the system tray icon
   */
  createTray: () => void;
}
