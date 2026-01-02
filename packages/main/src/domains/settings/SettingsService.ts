import type { ISettings } from '@writing-tools/shared';

import type { ISettingsRepository } from './ISettingsRepository';
import type { ISettingsService } from './ISettingsService';

export class SettingsService implements ISettingsService {
  private readonly repository: ISettingsRepository;

  public constructor(repository: ISettingsRepository) {
    this.repository = repository;
  }

  public loadSettings = async (): Promise<ISettings> => {
    return this.repository.loadSettings();
  };

  public saveSettings = async (settings: ISettings): Promise<void> => {
    return this.repository.saveSettings(settings);
  };
}
