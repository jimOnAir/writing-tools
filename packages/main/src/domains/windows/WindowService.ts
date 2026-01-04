import { BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as url from 'url';

import { getAppIcon } from '../../icons';
import type { ISettingsService } from '../settings/ISettingsService';

import type { IWindowService } from './IWindowService';
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

export class WindowService implements IWindowService {
  private settingsWindow: Electron.BrowserWindow | null = null;
  private chatWindow: Electron.BrowserWindow | null = null;
  private promptSelectorWindow: Electron.BrowserWindow | null = null;
  private chatListWindow: Electron.BrowserWindow | null = null;
  private readonly settingsService: ISettingsService;

  public constructor(settingsService: ISettingsService) {
    this.settingsService = settingsService;
  }

  /**
   * Find existing chat window without creating a new one
   * Uses BrowserWindow.getAllWindows() to find windows that match the chat window URL
   */
  private findExistingChatWindow(): BrowserWindow | null {
    const rendererUrl = this.getRendererUrl();
    const allWindows = BrowserWindow.getAllWindows();

    for (const win of allWindows) {
      if (win.isDestroyed()) {
        continue;
      }
      const winUrl = win.webContents.getURL();
      // Chat window URL matches rendererUrl (no view parameter) or is empty (still loading)
      if (winUrl === rendererUrl || winUrl === '' || winUrl.startsWith(rendererUrl)) {
        // Make sure it's not the settings window or chat list window
        if (!winUrl.includes('?view=settings') && !winUrl.includes('?view=chat-list') && !winUrl.includes('?view=prompt-selector')) {
          return win;
        }
      }
    }

    return null;
  }

  public async getChatWindow(): Promise<WindowCreationResult> {
    // First check our tracked window
    if (this.chatWindow && !this.chatWindow.isDestroyed()) {
      this.chatWindow.show();
      this.chatWindow.focus();

      return { created: false, window: this.chatWindow };
    }

    // If tracked window is null or destroyed, try to find existing window
    const existingWindow = this.findExistingChatWindow();
    if (existingWindow) {
      // Re-track the window
      this.chatWindow = existingWindow;
      // Re-register closed handler
      this.chatWindow.on('closed', () => {
        this.chatWindow = null;
      });
      this.chatWindow.show();
      this.chatWindow.focus();

      return { created: false, window: this.chatWindow };
    }
    this.chatWindow = new BrowserWindow({
      ...this.getNativeWindowOptions(),
      height: 900,
      width: 1400,
      resizable: true,
      maximizable: true,
      minimizable: true,
      minWidth: 600,
      minHeight: 400,
    });
    this.chatWindow.setMenu(null);

    const rendererUrl = this.getRendererUrl();

    // Wait for window to be ready before showing to prevent white flash
    this.chatWindow.once('ready-to-show', () => {
      if (this.chatWindow) {
        this.chatWindow.show();
        this.chatWindow.focus();
      }
    });

    await this.chatWindow.loadURL(rendererUrl);

    if (isDev) {
      this.chatWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.chatWindow.on('closed', () => {
      this.chatWindow = null;
    });

    return { window: this.chatWindow, created: true };
  }

  public async getPromptSelectorWindow(): Promise<WindowCreationResult> {
    if (this.promptSelectorWindow) {
      this.promptSelectorWindow.show();
      this.promptSelectorWindow.focus();

      return { created: false, window: this.promptSelectorWindow };
    }

    this.promptSelectorWindow = new BrowserWindow({
      ...this.getNativeWindowOptions(),
      height: 900,
      width: 1400,
      title: 'Select Prompt',
      resizable: true,
      maximizable: true,
      minimizable: true,
      minWidth: 600,
      minHeight: 400,
    });
    this.promptSelectorWindow.setMenu(null);

    // Wait for window to be ready before showing to prevent white flash
    this.promptSelectorWindow.once('ready-to-show', () => {
      if (this.promptSelectorWindow) {
        this.promptSelectorWindow.show();
        this.promptSelectorWindow.focus();
      }
    });

    const rendererUrl = `${this.getRendererUrl()}?view=prompt-selector`;

    await this.promptSelectorWindow.loadURL(rendererUrl);

    if (isDev) {
      this.promptSelectorWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.promptSelectorWindow.on('closed', () => {
      this.promptSelectorWindow = null;
    });

    return { window: this.promptSelectorWindow, created: true };
  }

  public async createSettingsWindow(): Promise<void> {
    if (this.settingsWindow) {
      this.settingsWindow.show();
      this.settingsWindow.focus();

      return;
    }

    this.settingsWindow = new BrowserWindow({
      ...this.getNativeWindowOptions(),
      height: 900,
      width: 1400,
      title: 'Settings',
      resizable: true,
      maximizable: true,
      minimizable: true,
      minWidth: 600,
      minHeight: 400,
    });

    this.settingsWindow.setMenu(null);

    // Wait for window to be ready before showing to prevent white flash
    this.settingsWindow.once('ready-to-show', () => {
      if (this.settingsWindow) {
        this.settingsWindow.show();
        this.settingsWindow.focus();
      }
    });

    const settingsUrl = `${this.getRendererUrl()}?view=settings`;

    await this.settingsWindow.loadURL(settingsUrl);

    // Open DevTools in development mode
    if (isDev) {
      this.settingsWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  public async getChatListWindow(): Promise<WindowCreationResult> {
    if (this.chatListWindow) {
      this.chatListWindow.show();
      this.chatListWindow.focus();

      return { created: false, window: this.chatListWindow };
    }

    this.chatListWindow = new BrowserWindow({
      ...this.getNativeWindowOptions(),
      height: 900,
      width: 1400,
      title: 'Chat List',
      resizable: true,
      maximizable: true,
      minimizable: true,
      minWidth: 600,
      minHeight: 400,
    });
    this.chatListWindow.setMenu(null);

    // Wait for window to be ready before showing to prevent white flash
    this.chatListWindow.once('ready-to-show', () => {
      if (this.chatListWindow) {
        this.chatListWindow.show();
        this.chatListWindow.focus();
      }
    });

    const rendererUrl = `${this.getRendererUrl()}?view=chat-list`;

    await this.chatListWindow.loadURL(rendererUrl);

    if (isDev) {
      this.chatListWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.chatListWindow.on('closed', () => {
      this.chatListWindow = null;
    });

    return { window: this.chatListWindow, created: true };
  }

  private getNativeWindowOptions(): Electron.BrowserWindowConstructorOptions {
    const platform = os.platform();
    const baseOptions: Electron.BrowserWindowConstructorOptions = {
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: getPreloadPath(),
      },
      icon: getAppIcon(),
      show: false, // Don't show until ready to avoid flash
    };

    if (platform === 'darwin') {
      // macOS: Use native frame with hidden title bar for modern look
      return {
        ...baseOptions,
        frame: true, // Keep native frame for traffic lights
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window', // Translucent background
        visualEffectState: 'active',
      };
    } else if (platform === 'win32') {
      // Windows: Use native frame with proper styling
      return {
        ...baseOptions,
        frame: true, // Native frame with Windows controls
        titleBarStyle: 'default',
      };
    } else {
      // Linux: Use native frame with system decorations
      return {
        ...baseOptions,
        frame: true, // Native frame with system window controls
        titleBarStyle: 'default',
      };
    }
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
