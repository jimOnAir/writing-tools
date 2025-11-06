import { Tray, Menu, MenuItemConstructorOptions, NativeImage, app } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import { nativeImage } from 'electron';
import { createSettingsWindow as showSettingsWindow, getChatWindow as showChatWindow } from './windows';
import { logger } from './utils/logger';

let tray: Tray | null = null;

export function createTray() {
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
    logger.error('Failed to create tray icon from path: %s, %s', iconPath, error);
    // Fallback to a default icon or create a simple one
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const menuItems: MenuItemConstructorOptions[] = [
    {
      label: 'Restore',
      click: () => {
        showChatWindow();
      },
    },
    {
      label: 'Settings',
      click: () => {
        showSettingsWindow();
      },
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
}

export { tray };
