import { BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import * as path from 'path';
import * as url from 'url';

import { getAppIcon } from './icons';
import { loadSettings } from './settings';

let settingsWindow: Electron.BrowserWindow | null = null;
let chatWindow: Electron.BrowserWindow | null = null;
let promptSelectorWindow: Electron.BrowserWindow | null = null;

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
    width: 800,
    icon: getAppIcon(),
    resizable: false,
    maximizable: false,
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

export async function getPromptSelectorWindow() {
  if (promptSelectorWindow) {
    promptSelectorWindow.show();
    promptSelectorWindow.focus();

    return { created: false, window: promptSelectorWindow };
  }

  const settings = await loadSettings();
  const promptCount = settings.preconfiguredPrompts.length;
  const minHeight = 800;
  const maxHeight = 1200;
  const additionalHeight = promptCount * 50;
  const height = Math.min(Math.max(minHeight, minHeight + additionalHeight), maxHeight);
  const width = 600;

  promptSelectorWindow = new BrowserWindow({
    height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    width,
    icon: getAppIcon(),
    title: 'Select Prompt',
    resizable: false,
    maximizable: false,
  });
  promptSelectorWindow.setMenu(null);

  const rendererUrl = getRendererUrl() + '?view=prompt-selector';

  await promptSelectorWindow.loadURL(rendererUrl);

  if (isDev) {
    promptSelectorWindow.webContents.openDevTools();
  }

  promptSelectorWindow.on('closed', () => {
    promptSelectorWindow = null;
  });

  promptSelectorWindow.show();
  promptSelectorWindow.focus();

  return { window: promptSelectorWindow, created: true };
}

function getRendererUrl() {
  return isDev
    ? 'http://localhost:3000'
    : url.format({
      pathname: path.join(__dirname, '../renderer/index.html'),
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
