import type { ISettings, ILogger } from '@writing-tools/shared';
import { DefaultSettings } from '@writing-tools/shared';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { ISettingsRepository } from './ISettingsRepository';

// TODO: save in db

export class SettingsRepository implements ISettingsRepository {
  private currentSettings: ISettings | null = null;
  private settingsLoaded = false;

  public constructor(
    private readonly logger: ILogger,
    private readonly appPath: string,
  ) {}

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
        // Migrate prompts to ensure they have provider/model fields (even if undefined)
        const migratedPrompts = loadedSettings.preconfiguredPrompts
          ? loadedSettings.preconfiguredPrompts.map(prompt => ({
            ...prompt,
            provider: prompt.provider ?? undefined,
            model: prompt.model ?? undefined,
          }))
          : DefaultSettings.preconfiguredPrompts;

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
          preconfiguredPrompts: migratedPrompts,
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

      this.logger.error('Failed to load settings: %s', errorText);

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
      this.settingsLoaded = true;
    } catch (error) {
      const errorText = error instanceof Error
        ? error.message
        : String(error);

      this.logger.error('Failed to save settings: %s', errorText);
      throw error;
    }
  }

  private async ensureSettingsDirectory(): Promise<void> {
    try {
      await fs.access(this.appPath);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(this.appPath, { recursive: true });
    }
  }

  private getSettingsFilePath(): string {
    return path.join(this.appPath, 'settings.json');
  }
}
