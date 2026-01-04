import { BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';

import { getAppIcon } from '../../icons';

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
  private chatListWindow: Electron.BrowserWindow | null = null;

  public async getMainWindow(): Promise<WindowCreationResult> {
    // First check our tracked window
    if (this.chatListWindow && !this.chatListWindow.isDestroyed()) {
      this.chatListWindow.show();
      this.chatListWindow.focus();

      return { created: false, window: this.chatListWindow };
    }

    // If tracked window is null or destroyed, try to find existing window
    const existingWindow = this.findExistingMainWindow();
    if (existingWindow) {
      // Re-track the window
      this.chatListWindow = existingWindow;
      // Re-register closed handler
      this.chatListWindow.on('closed', () => {
        this.chatListWindow = null;
      });
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

    const rendererUrl = this.getRendererUrl();

    // Wait for window to be ready before showing to prevent white flash
    this.chatListWindow.once('ready-to-show', () => {
      if (this.chatListWindow) {
        this.chatListWindow.show();
        this.chatListWindow.focus();
      }
    });

    await this.chatListWindow.loadURL(rendererUrl);

    if (isDev) {
      this.chatListWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.chatListWindow.on('closed', () => {
      this.chatListWindow = null;
    });

    return { window: this.chatListWindow, created: true };
  }

  /**
   * Find existing mainWindow without creating a new one
   * Uses BrowserWindow.getAllWindows() to find windows that match the mainWindow URL
   * MainWindow URL is the base renderer URL without any view parameters
   */
  private findExistingMainWindow(): BrowserWindow | null {
    const rendererUrl = this.getRendererUrl();
    const allWindows = BrowserWindow.getAllWindows();

    for (const win of allWindows) {
      if (win.isDestroyed()) {
        continue;
      }
      const winUrl = win.webContents.getURL();
      // MainWindow URL matches rendererUrl exactly (no view parameter) or is empty (still loading)
      // Exclude windows with view parameters (settings, prompt-selector, etc.)
      if ((winUrl === rendererUrl || winUrl === '') && !winUrl.includes('?view=')) {
        return win;
      }
    }

    return null;
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
    }

    // Windows and Linux: Use native frame with system decorations
    return {
      ...baseOptions,
      frame: true, // Native frame with system window controls
      titleBarStyle: 'default',
    };
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
