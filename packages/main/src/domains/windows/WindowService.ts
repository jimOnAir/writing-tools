import { BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

import { getAppIcon } from '../../icons';
import { SettingsService } from '../settings';

import type { WindowCreationResult } from './WindowTypes';

function getPreloadPath(): string {
  // When bundled with esbuild, both main.js and preload.js are in the same directory
  // __dirname in bundled code will be the directory containing main.js (dist/electron-app/)
  const preloadPath = path.join(__dirname, 'preload.js');

  if (isDev) {
    // In development, check if file exists in the same directory
    if (fs.existsSync(preloadPath)) {
      return preloadPath;
    }
    // Fallback: try resolving from project root (for development)
    const fallbackPath = path.resolve(process.cwd(), 'packages/main/dist/electron-app/preload.js');
    if (fs.existsSync(fallbackPath)) {
      return fallbackPath;
    }
  }

  // Default: assume same directory (works when bundled)
  return preloadPath;
}

export class WindowService {
  private settingsWindow: Electron.BrowserWindow | null = null;
  private chatWindow: Electron.BrowserWindow | null = null;
  private promptSelectorWindow: Electron.BrowserWindow | null = null;
  private readonly settingsService: SettingsService;

  public constructor(settingsService: SettingsService = new SettingsService()) {
    this.settingsService = settingsService;
  }

  public async getChatWindow(): Promise<WindowCreationResult> {
    if (this.chatWindow) {
      this.chatWindow.show();
      this.chatWindow.focus();

      return { created: false, window: this.chatWindow };
    }

    this.chatWindow = new BrowserWindow({
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: getPreloadPath(),
      },
      width: 800,
      icon: getAppIcon(),
      resizable: false,
      maximizable: false,
    });
    this.chatWindow.setMenu(null);

    const rendererUrl = this.getRendererUrl();

    await this.chatWindow.loadURL(rendererUrl);

    if (isDev) {
      this.chatWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.chatWindow.on('closed', () => {
      this.chatWindow = null;
    });

    this.chatWindow.show();
    this.chatWindow.focus();

    return { window: this.chatWindow, created: true };
  }

  public async getPromptSelectorWindow(): Promise<WindowCreationResult> {
    if (this.promptSelectorWindow) {
      this.promptSelectorWindow.show();
      this.promptSelectorWindow.focus();

      return { created: false, window: this.promptSelectorWindow };
    }

    const settings = await this.settingsService.loadSettings();
    const promptCount = settings.preconfiguredPrompts.length;
    const minHeight = 800;
    const maxHeight = 1200;
    const additionalHeight = promptCount * 50;
    const height = Math.min(Math.max(minHeight, minHeight + additionalHeight), maxHeight);
    const width = 600;

    this.promptSelectorWindow = new BrowserWindow({
      height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: getPreloadPath(),
      },
      width,
      icon: getAppIcon(),
      title: 'Select Prompt',
      resizable: false,
      maximizable: false,
    });
    this.promptSelectorWindow.setMenu(null);

    const rendererUrl = this.getRendererUrl() + '?view=prompt-selector';

    await this.promptSelectorWindow.loadURL(rendererUrl);

    if (isDev) {
      this.promptSelectorWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.promptSelectorWindow.on('closed', () => {
      this.promptSelectorWindow = null;
    });

    this.promptSelectorWindow.show();
    this.promptSelectorWindow.focus();

    return { window: this.promptSelectorWindow, created: true };
  }

  public async createSettingsWindow(): Promise<void> {
    if (this.settingsWindow) {
      this.settingsWindow.show();
      this.settingsWindow.focus();

      return;
    }

    this.settingsWindow = new BrowserWindow({
      height: 400,
      width: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: getPreloadPath(),
      },
      icon: getAppIcon(),
      title: 'Settings',
    });

    this.settingsWindow.setMenu(null);

    const settingsUrl = this.getRendererUrl() + '?view=settings';

    await this.settingsWindow.loadURL(settingsUrl);

    // Open DevTools in development mode
    if (isDev) {
      this.settingsWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    this.settingsWindow.show();
    this.settingsWindow.focus();
  }

  private getRendererUrl(): string {
    return isDev
      ? 'http://localhost:3000'
      : url.format({
        pathname: path.join(__dirname, '../../renderer/index.html'),
        protocol: 'file:',
        slashes: true,
      });
  }
}
