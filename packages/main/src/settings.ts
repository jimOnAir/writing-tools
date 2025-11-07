import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import isDev from 'electron-is-dev';
import { ISettings, DefaultSettings, logger } from '@writing-tools/shared';

// Get the app data directory
export const getAppDataDirectory = () => {
  if (isDev) {
    return path.join(process.cwd(), 'app-data');
  }
  return path.join(app.getPath('appData'), app.getName());
};

// Get settings file path
export const getSettingsFilePath = () => {
  const appDataDir = getAppDataDirectory();
  return path.join(appDataDir, 'settings.json');
};

// Create settings file directory if it doesn't exist
export const ensureSettingsDirectory = () => {
  const appDataDir = getAppDataDirectory();
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
};


// Load settings from file
export const loadSettings = (): ISettings => {
  try {
    ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    } else {
      // Return default settings
      return DefaultSettings;
    }
  } catch (error) {
    logger.error('Failed to load settings: %s', error);
    // Return default settings if there's an error
    return DefaultSettings;
  }
};

// Save settings to file
export const saveSettings = (settings: ISettings) => {
  try {
    ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    logger.error('Failed to save settings: %s', error);
    throw error;
  }
};
