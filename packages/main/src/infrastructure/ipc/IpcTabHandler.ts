import type { ILogger, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';
import type { IOpenTabsService } from 'src/domains/open-tabs/IOpenTabsService';

import type { IIpcTabHandler } from './IIpcTabHandler';

type TTabChannelEventPayload = TIpcEvent<EIpcChannel.TAB, EIpcEvent.TABS_LOAD>
  | TIpcEvent<EIpcChannel.TAB, EIpcEvent.TABS_SAVE>;

export class IpcTabHandler implements IIpcTabHandler {
  constructor(
    private readonly openTabsService: IOpenTabsService,
    private readonly logger: ILogger,
  ) {}

  public register(): void {
    ipcMain.handle(EIpcChannel.TAB, (_, data: TTabChannelEventPayload) => {
      const eventType = data.event;
      switch (data.event) {
        case EIpcEvent.TABS_LOAD:
          return this.handleChatLoadTabs();
        case EIpcEvent.TABS_SAVE:
          return this.handleChatSaveTabs(data.payload.tabs);

        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });
  }

  private handleChatLoadTabs() {
    try {
      const tabs = this.openTabsService.loadOpenTabs();

      return { tabs };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to load tabs: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatSaveTabs(tabs: Array<{ chatId: number | null, tabOrder: number, isActive: boolean }>) {
    try {
      this.openTabsService.saveOpenTabs(tabs);

      return { success: true };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save tabs: %s', errorText);

      return { success: false, error: errorText };
    }
  }
}
