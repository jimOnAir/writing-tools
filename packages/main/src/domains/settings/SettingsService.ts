import type { ISettings } from '@writing-tools/shared';

import { SettingsRepository } from './SettingsRepository';

export class SettingsService {
  private readonly repository: SettingsRepository;

  public constructor(repository: SettingsRepository = new SettingsRepository()) {
    this.repository = repository;
  }

  public async loadSettings(): Promise<ISettings> {
    return this.repository.loadSettings();
  }

  public async saveSettings(settings: ISettings): Promise<void> {
    return this.repository.saveSettings(settings);
  }
}
