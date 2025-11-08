import type { ISettings } from '@writing-tools/shared';
import { DefaultSettings, logger } from '@writing-tools/shared';
import { app } from 'electron';
import isDev from 'electron-is-dev';
import * as fs from 'fs';
import * as path from 'path';

export const getSettingsFilePath = () => {
  const appDataDir = getAppDataDirectory();

  return path.join(appDataDir, 'settings.json');
};

export const ensureSettingsDirectory = () => {
  const appDataDir = getAppDataDirectory();
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
};

export const loadSettings = (): ISettings => {
  try {
    ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');

      const settings = JSON.parse(settingsData) as ISettings;

      return settings;
    } else {
      return DefaultSettings;
    }
  } catch (error) {
    const errorText = error instanceof Error
      ? error.message
      : String(error);

    logger.error('Failed to load settings: %s', errorText);

    return DefaultSettings;
  }
};

export const saveSettings = (settings: ISettings) => {
  try {
    ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
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
