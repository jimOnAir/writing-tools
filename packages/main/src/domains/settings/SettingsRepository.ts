import type { ISettings } from '@writing-tools/shared';
import { DefaultSettings, logger } from '@writing-tools/shared';
import { app } from 'electron';
import isDev from 'electron-is-dev';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SettingsRepository {
  private currentSettings: ISettings | null = null;
  private settingsLoaded = false;

  public async loadSettings(): Promise<ISettings> {
    // If settings are already loaded, return cached version
    if (this.settingsLoaded && this.currentSettings !== null) {
      return this.currentSettings;
    }

    try {
      await this.ensureSettingsDirectory();
      const settingsPath = this.getSettingsFilePath();

      try {
        // Try to read existing settings file
        const settingsData = await fs.readFile(settingsPath, 'utf8');
        const loadedSettings = JSON.parse(settingsData) as Partial<ISettings>;

        // Merge with default settings to ensure all fields are present
        const settings: ISettings = {
          ...DefaultSettings,
          ...loadedSettings,
          ollama: {
            ...DefaultSettings.ollama,
            ...loadedSettings.ollama,
          },
          lmstudio: {
            ...DefaultSettings.lmstudio,
            ...loadedSettings.lmstudio,
          },
          preconfiguredPrompts: loadedSettings.preconfiguredPrompts ?? DefaultSettings.preconfiguredPrompts,
        };

        this.currentSettings = settings;
        this.settingsLoaded = true;

        return settings;
      } catch {
        // If file doesn't exist or is invalid, return default settings
        const defaultSettings = DefaultSettings;
        this.currentSettings = defaultSettings;
        this.settingsLoaded = true;

        return defaultSettings;
      }
    } catch (error) {
      const errorText = error instanceof Error
        ? error.message
        : String(error);

      logger.error('Failed to load settings: %s', errorText);

      // Return default settings on error
      const defaultSettings = DefaultSettings;
      this.currentSettings = defaultSettings;
      this.settingsLoaded = true;

      return defaultSettings;
    }
  }

  public async saveSettings(settings: ISettings): Promise<void> {
    try {
      await this.ensureSettingsDirectory();
      const settingsPath = this.getSettingsFilePath();
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

      // Update in-memory cache
      this.currentSettings = settings;
    } catch (error) {
      const errorText = error instanceof Error
        ? error.message
        : String(error);

      logger.error('Failed to save settings: %s', errorText);
      throw error;
    }
  }

  private getSettingsFilePath(): string {
    const appDataDir = this.getAppDataDirectory();

    return path.join(appDataDir, 'settings.json');
  }

  private async ensureSettingsDirectory(): Promise<void> {
    const appDataDir = this.getAppDataDirectory();
    try {
      await fs.access(appDataDir);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(appDataDir, { recursive: true });
    }
  }

  private getAppDataDirectory(): string {
    if (isDev) {
      return path.join(process.cwd(), 'app-data');
    }

    return path.join(app.getPath('appData'), app.getName());
  }
}
