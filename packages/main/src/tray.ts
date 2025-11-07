import { Tray, Menu, MenuItemConstructorOptions, app } from 'electron';
import { createSettingsWindow, getChatWindow } from './windows';
import { getAppIcon } from './icons';

let tray: Tray | null = null;

export function createTray() {


  tray = new Tray(getAppIcon());

  const menuItems: MenuItemConstructorOptions[] = [
    {
      label: 'Restore',
      click: () => {
        getChatWindow();
      },
    },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow();
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
