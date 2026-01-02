/**
 * Interface for text selection service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface ITextSelectionService {
  /**
   * Get the currently selected text from the active application
   */
  getSelectedText: () => string | null;
}
