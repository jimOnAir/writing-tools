import { Tray, Menu, MenuItemConstructorOptions, NativeImage, app } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import { nativeImage } from 'electron';
import { createSettingsWindow, createMainWindow } from './windows';

let tray: Tray | null = null;

export function createTray(mainWindow: Electron.BrowserWindow | null) {
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
      createMainWindow();
    }
  });
}

export { tray };
