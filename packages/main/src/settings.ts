import type { ISettings } from '@writing-tools/shared';
import { DefaultSettings, logger } from '@writing-tools/shared';
import { app } from 'electron';
import isDev from 'electron-is-dev';
import * as fs from 'fs/promises';
import * as path from 'path';

// In-memory settings store
let currentSettings: ISettings | null = null;
let settingsLoaded = false;

export const getSettingsFilePath = () => {
  const appDataDir = getAppDataDirectory();

  return path.join(appDataDir, 'settings.json');
};

export const ensureSettingsDirectory = async () => {
  const appDataDir = getAppDataDirectory();
  try {
    await fs.access(appDataDir);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(appDataDir, { recursive: true });
  }
};

export const loadSettings = async (): Promise<ISettings> => {
  // If settings are already loaded, return cached version
  if (settingsLoaded && currentSettings !== null) {
    return currentSettings;
  }

  try {
    await ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();

    try {
      // Try to read existing settings file
      const settingsData = await fs.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData) as ISettings;

      currentSettings = settings;
      settingsLoaded = true;

      return settings;
    } catch {
      // If file doesn't exist or is invalid, return default settings
      const defaultSettings = DefaultSettings;
      currentSettings = defaultSettings;
      settingsLoaded = true;

      return defaultSettings;
    }
  } catch (error) {
    const errorText = error instanceof Error
      ? error.message
      : String(error);

    logger.error('Failed to load settings: %s', errorText);

    // Return default settings on error
    const defaultSettings = DefaultSettings;
    currentSettings = defaultSettings;
    settingsLoaded = true;

    return defaultSettings;
  }
};

export const saveSettings = async (settings: ISettings): Promise<void> => {
  try {
    await ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    // Update in-memory cache
    currentSettings = settings;
  } catch (error) {
    const errorText = error instanceof Error
      ? error.message
      : String(error);

    logger.error('Failed to save settings: %s', errorText);
    throw error;
  }
};

const getAppDataDirectory = () => {
  if (isDev) {
    return path.join(process.cwd(), 'app-data');
  }

  return path.join(app.getPath('appData'), app.getName());
};
