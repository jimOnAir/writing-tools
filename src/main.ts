import { app, BrowserWindow, Menu, Tray, nativeImage, MenuItemConstructorOptions, NativeImage, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
import isDev from 'electron-is-dev';
import * as fs from 'fs';
import { Ollama } from 'ollama';
import { ISettings } from './interfaces/ISettings';

let mainWindow: Electron.BrowserWindow | null;
let settingsWindow: Electron.BrowserWindow | null = null;
let tray: Tray | null = null;

// Get the app data directory
const getAppDataDirectory = () => {
  if (isDev) {
    return path.join(process.cwd(), 'app-data');
  }
  return path.join(app.getPath('appData'), app.getName());
};

// Get settings file path
const getSettingsFilePath = () => {
  const appDataDir = getAppDataDirectory();
  return path.join(appDataDir, 'settings.json');
};

// Create settings file directory if it doesn't exist
const ensureSettingsDirectory = () => {
  const appDataDir = getAppDataDirectory();
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
};

// Load settings from file
const loadSettings = (): ISettings => {
  try {
    ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    } else {
      // Return default settings
      return {
        ollama: {
          address: 'http://localhost:11434',
          model: undefined,
        },
      };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Return default settings if there's an error
    return {
      ollama: {
        address: 'http://localhost:11434',
        model: undefined,
      },
    };
  }
};

// Save settings to file
const saveSettings = (settings: any) => {
  try {
    ensureSettingsDirectory();
    const settingsPath = getSettingsFilePath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
};

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/logo192.png')
    : path.join(__dirname, 'logo192.png');

  let icon: NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    console.error('Failed to create tray icon from path:', iconPath, error);
    // Fallback to a default icon or create a simple one
    icon = nativeImage.createEmpty();
  }


  mainWindow = new BrowserWindow({
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    width: 1280,
    icon,
  });
  mainWindow.setMenu(null);

  const rendererUrl = isDev
    ? 'http://localhost:3000'
    : url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
  });

  mainWindow.loadURL(rendererUrl);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray when window is closed
  mainWindow.on('close', (event) => {
    if (tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    // If window already exists, focus it
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const iconPath = isDev
    ? path.join(__dirname, '../public/logo192.png')
    : path.join(__dirname, 'logo192.png');

  let icon: NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    console.error('Failed to create tray icon from path:', iconPath, error);
    // Fallback to a default icon or create a simple one
    icon = nativeImage.createEmpty();
  }

  settingsWindow = new BrowserWindow({
    height: 400,
    width: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon,
    title: 'Settings',
  });

  settingsWindow.setMenu(null);

  // For development, we'll load the settings component in the main window
  // For production, we would create a separate window with settings.html
  const rendererUrl = isDev
    ? 'http://localhost:3000'
    : url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
  });

  // Add a query parameter to indicate we want to show settings
  const settingsUrl = isDev
    ? rendererUrl + '?view=settings'
    : rendererUrl;

  settingsWindow.loadURL(settingsUrl);

  // Open DevTools in development mode
  if (isDev) {
    settingsWindow.webContents.openDevTools();
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  // Create tray icon - using appropriate icon for tray
  let iconPath: string;

  // For development mode, use the icon from public directory
  // For production, use the icon from dist directory
  if (isDev) {
    iconPath = path.join(__dirname, '../public/logo192.png');
  } else {
    iconPath = path.join(__dirname, 'logo192.png');
  }

  // Try to create tray icon with fallback
  let icon: NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    console.error('Failed to create tray icon from path:', iconPath, error);
    // Fallback to a default icon or create a simple one
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const menuItems: MenuItemConstructorOptions[] = [
    {
      label: 'Restore',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ];

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
  tray.setIgnoreDoubleClickEvents(false);

  // Handle double-click on tray icon to restore the app
  tray.on('click', () => {
    if (mainWindow) {
      // Bring window to front and focus it
      mainWindow.show();
      mainWindow.focus();
    } else {
      // Create new window if it doesn't exist
      createWindow();
    }
  });
}

// IPC handlers
ipcMain.handle('load-settings', async () => {
  return loadSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    saveSettings(settings);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fetch-ollama-models', async (event, ollamaAddress) => {
  try {
    const ollama = new Ollama({ host: ollamaAddress });
    const response = await ollama.list();
    return { models: response.models };
  } catch (error: any) {
    console.error('Failed to fetch Ollama models:', error);
    return { error: error.message };
  }
});

app.on('ready', () => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
