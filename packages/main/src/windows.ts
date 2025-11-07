import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
import isDev from 'electron-is-dev';
import { getAppIcon } from './icons';

let settingsWindow: Electron.BrowserWindow | null = null;
let chatWindow: Electron.BrowserWindow | null = null;

export function getChatWindow() {
  chatWindow = new BrowserWindow({
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    width: 1280,
    icon: getAppIcon(),
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

  settingsWindow = new BrowserWindow({
    height: 400,
    width: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: getAppIcon(),
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
