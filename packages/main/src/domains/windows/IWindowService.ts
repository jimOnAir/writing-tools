import type { WindowCreationResult } from './WindowTypes';

/**
 * Interface for window service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IWindowService {
  /**
   * Get or create the main window
   */
  getMainWindow: () => Promise<WindowCreationResult>;
}
