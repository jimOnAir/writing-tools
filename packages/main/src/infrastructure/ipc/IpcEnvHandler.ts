import { EIpcChannel } from '@writing-tools/shared';
import { ipcMain } from 'electron';
import * as os from 'node:os';

import type { IIpcEnvHandler } from './IIpcEnvHandler';

export class IpcEnvHandler implements IIpcEnvHandler {
  public register(): void {
    ipcMain.handle(EIpcChannel.ENV, () => {
      return {
        arch: os.arch(), // 'x64', 'arm64', etc.
        platform: os.platform(), // 'win32', 'darwin', 'linux'
        release: os.release(),
      };
    });
  }
}
