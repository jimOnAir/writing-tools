import type { ISettings, TIpcEvent } from '@writing-tools/shared';
import { EIpcEvent, EIpcChannel } from '@writing-tools/shared';
import { ipcMain } from 'electron';

import type { ISettingsService } from '../../domains/settings/ISettingsService';

import type { IIpcSettingsHandler } from './IIpcSettingsHandler';

type TSettingChannelEventPayload = TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD>
  | TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE>;

export class IpcSettingsHandler implements IIpcSettingsHandler {
  public constructor(
    private readonly settingsService: ISettingsService,
  ) {}

  public register(): void {
    ipcMain.handle(EIpcChannel.SETTINGS, async (_, data: TSettingChannelEventPayload) => {
      const eventType = data.event;
      switch (data.event) {
        case EIpcEvent.SETTINGS_LOAD:
          return this.handleSettingsLoad();
        case EIpcEvent.SETTINGS_SAVE:
          return this.handleSettingsSave(data.payload);
        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });
  }

  private async handleSettingsLoad() {
    return this.settingsService.loadSettings();
  }

  private async handleSettingsSave(settings: ISettings) {
    try {
      // #region agent log
      try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const logDir = path.join(process.cwd(), '.cursor');
        const logPath = path.join(logDir, 'debug.log');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(logPath, JSON.stringify({ location: 'IpcSettingsHandlers.ts:handleSettingsSave', message: 'main process saving', data: { ollamaModel: settings?.ollama?.model, lmstudioModel: settings?.lmstudio?.model, provider: settings?.provider }, timestamp: Date.now(), hypothesisId: 'H-save' }) + '\n');
      } catch {
        // ignore log errors
      }
      // #endregion
      await this.settingsService.saveSettings(settings);

      return { success: true };
    } catch (error: unknown) {
      const errorText = error instanceof Error
        ? error.message
        : String(error);

      return { success: false, error: errorText };
    }
  }
}
