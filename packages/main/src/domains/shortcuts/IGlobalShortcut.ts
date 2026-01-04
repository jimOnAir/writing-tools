/**
 * Interface for global shortcut operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IGlobalShortcut {
  /**
   * Register a global shortcut
   * @param accelerator - The accelerator string (e.g., 'Command+Shift+I')
   * @param callback - The callback function to execute when the shortcut is pressed
   * @returns true if registration was successful, false otherwise
   */
  register: (accelerator: string, callback: () => void) => boolean;

  /**
   * Unregister all global shortcuts
   */
  unregisterAll: () => void;
}
