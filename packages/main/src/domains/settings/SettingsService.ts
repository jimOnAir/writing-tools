import type { ISettings } from '@writing-tools/shared';

import type { ISettingsRepository } from './ISettingsRepository';
import type { ISettingsService } from './ISettingsService';

export class SettingsService implements ISettingsService {
  public constructor(
    private readonly repository: ISettingsRepository,
  ) {}

  public loadSettings = async (): Promise<ISettings> => {
    return this.repository.loadSettings();
  };

  public saveSettings = async (settings: ISettings): Promise<void> => {
    return this.repository.saveSettings(settings);
  };
}
