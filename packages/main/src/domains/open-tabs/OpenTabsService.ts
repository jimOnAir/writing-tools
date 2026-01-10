import type { TOpenTab } from '@writing-tools/shared';

import type { IOpenTabsRepository } from './IOpenTabsRepository';
import type { IOpenTabsService } from './IOpenTabsService';

export class OpenTabsService implements IOpenTabsService {
  public constructor(
    private readonly openTabsRepository: IOpenTabsRepository,
  ) {}

  public saveOpenTabs(tabs: TOpenTab[]) {
    this.openTabsRepository.saveOpenTabs(tabs);
  }

  public loadOpenTabs() {
    return this.openTabsRepository.loadOpenTabs();
  }

  public clearOpenTabs() {
    this.openTabsRepository.clearOpenTabs();
  }

  public deleteTabsByChatId(chatId: number) {
    this.openTabsRepository.deleteTabsByChatId(chatId);
  }
}
