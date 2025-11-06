import { BrowserWindow, NativeImage, nativeImage } from 'electron';
import * as path from 'path';
import * as url from 'url';
import isDev from 'electron-is-dev';
import { logger } from './utils/logger';

let settingsWindow: Electron.BrowserWindow | null = null;
let chatWindow: Electron.BrowserWindow | null = null;

export function getChatWindow() {
  // If chat window already exists, just show and focus it
  if (chatWindow) {
    chatWindow.show();
    chatWindow.focus();
    return { window: chatWindow, created: false };
  }

  const iconPath = isDev
    ? path.join(__dirname, '../public/logo192.png')
    : path.join(__dirname, 'logo192.png');

  let icon: NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    logger.error('Failed to create tray icon from path: %s, %s', iconPath, error);
    // Fallback to a default icon or create a simple one
    icon = nativeImage.createEmpty();
  }

  chatWindow = new BrowserWindow({
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    width: 1280,
    icon,
    resizable: true,
    maximizable: true,
  });
  chatWindow.setMenu(null);

  const rendererUrl = isDev
    ? 'http://localhost:3000'
    : url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
  });

  chatWindow.loadURL(rendererUrl);

  // Open DevTools in development mode
  if (isDev) {
    chatWindow.webContents.openDevTools();
  }

  // Handle window close event
  chatWindow.on('closed', () => {
    chatWindow = null;
  });

  // Return the window instance
  chatWindow.show();
  chatWindow.focus();
  return { window: chatWindow, created: true };
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
    logger.error('Failed to create tray icon from path: %s, %s', iconPath, error);
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

  settingsWindow.show();
  settingsWindow.focus();
}
