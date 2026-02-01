import { BrowserWindow } from 'electron';

/**
 * Send an IPC payload to all existing, non-destroyed renderer windows.
 * Used by db-watcher subscribers and other code that needs to broadcast to renderers.
 */
export function sendToAllWindows(channel: string, payload: unknown): void {
  const allWindows = BrowserWindow.getAllWindows();
  for (const win of allWindows) {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send(channel, payload);
      } catch {
        // Window might be destroyed, ignore
      }
    }
  }
}
