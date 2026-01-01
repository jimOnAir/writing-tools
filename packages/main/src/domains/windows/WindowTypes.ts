import type { BrowserWindow } from 'electron';

export type WindowType = 'chat' | 'settings' | 'prompt-selector';

export interface WindowCreationResult {
  created: boolean;
  window: BrowserWindow;
}
