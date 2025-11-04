import { BrowserWindow, NativeImage } from 'electron';
import * as path from 'path';
import * as url from 'url';
import isDev from 'electron-is-dev';
import { nativeImage } from 'electron';

let mainWindow: Electron.BrowserWindow | null = null;
let settingsWindow: Electron.BrowserWindow | null = null;

export function createMainWindow() {
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
    // We'll handle tray reference in the main file
    // This is a placeholder for now
    event.preventDefault();
    mainWindow?.hide();
  });
}

export function createSettingsWindow() {
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

export { mainWindow, settingsWindow };
