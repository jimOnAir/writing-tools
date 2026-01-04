import { DefaultSettings } from '@writing-tools/shared';
import type { ISettings } from '@writing-tools/shared';

import type { ISettingsRepository } from './ISettingsRepository';
import { SettingsService } from './SettingsService';

describe('SettingsService', () => {
  let mockRepository: jest.Mocked<ISettingsRepository>;
  let settingsService: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<ISettingsRepository>;

    settingsService = new SettingsService(mockRepository);
  });

  describe('loadSettings', () => {
    it('loads settings from repository', async () => {
      const mockSettings: ISettings = {
        ...DefaultSettings,
        provider: 'lmstudio',
      };

      mockRepository.loadSettings.mockResolvedValue(mockSettings);

      const settings = await settingsService.loadSettings();

      expect(mockRepository.loadSettings).toHaveBeenCalled();
      expect(settings).toEqual(mockSettings);
    });

    it('handles repository errors', async () => {
      mockRepository.loadSettings.mockRejectedValue(new Error('Load failed'));

      await expect(settingsService.loadSettings()).rejects.toThrow('Load failed');
    });
  });

  describe('saveSettings', () => {
    it('saves settings to repository', async () => {
      const mockSettings: ISettings = DefaultSettings;

      mockRepository.saveSettings.mockResolvedValue();

      await settingsService.saveSettings(mockSettings);

      expect(mockRepository.saveSettings).toHaveBeenCalledWith(mockSettings);
    });

    it('handles repository errors', async () => {
      mockRepository.saveSettings.mockRejectedValue(new Error('Save failed'));

      await expect(settingsService.saveSettings(DefaultSettings)).rejects.toThrow('Save failed');
    });
  });
});
