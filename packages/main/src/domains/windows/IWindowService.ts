import type { WindowCreationResult } from './WindowTypes';

/**
 * Interface for window service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IWindowService {
  /**
   * Get or create the chat window
   */
  getChatWindow: () => Promise<WindowCreationResult>;

  /**
   * Get or create the prompt selector window
   */
  getPromptSelectorWindow: () => Promise<WindowCreationResult>;

  /**
   * Create or show the settings window
   */
  createSettingsWindow: () => Promise<void>;
}
