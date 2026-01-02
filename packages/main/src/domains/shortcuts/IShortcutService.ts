/**
 * Interface for shortcut service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IShortcutService {
  /**
   * Register global keyboard shortcuts
   */
  registerGlobalShortcuts: () => Promise<void>;

  /**
   * Process the global shortcut action
   */
  processGlobalShortcut: () => Promise<void>;
}
