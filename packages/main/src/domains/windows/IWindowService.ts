import type { BrowserWindow } from 'electron';

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

  /**
   * Get the main window if it exists, without creating or showing it.
   * Returns null if the window has not been created yet.
   */
  getExistingMainWindow: () => BrowserWindow | null;

  /**
   * Register a callback to run when the main window is ready (created or found).
   * Invoked once per window instance.
   */
  registerOnMainWindowReady: (callback: (win: BrowserWindow) => void) => void;
}
