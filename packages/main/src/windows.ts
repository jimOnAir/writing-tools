import { BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import * as path from 'path';
import * as url from 'url';

import { getAppIcon } from './icons';

let settingsWindow: Electron.BrowserWindow | null = null;
let chatWindow: Electron.BrowserWindow | null = null;

export async function getChatWindow() {
  if (chatWindow) {
    chatWindow.show();
    chatWindow.focus();

    return { created: false, window: chatWindow };
  }

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

  const rendererUrl = getRendererUrl();

  await chatWindow.loadURL(rendererUrl);

  if (isDev) {
    chatWindow.webContents.openDevTools();
  }

  chatWindow.on('closed', () => {
    chatWindow = null;
  });

  chatWindow.show();
  chatWindow.focus();

  return { window: chatWindow, created: true };
}

function getRendererUrl() {
  return isDev
    ? 'http://localhost:3000'
    : url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
    });
}

export async function createSettingsWindow() {
  if (settingsWindow) {
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

  const settingsUrl = getRendererUrl() + '?view=settings';

  await settingsWindow.loadURL(settingsUrl);

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
