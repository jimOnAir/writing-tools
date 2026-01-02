import type { ISettings } from '@writing-tools/shared';

/**
 * Interface for settings repository operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface ISettingsRepository {
  /**
   * Load settings from storage
   */
  loadSettings: () => Promise<ISettings>;

  /**
   * Save settings to storage
   */
  saveSettings: (settings: ISettings) => Promise<void>;
}
