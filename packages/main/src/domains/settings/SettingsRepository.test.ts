import { DefaultSettings } from '@writing-tools/shared';
import type { ILogger, ISettings } from '@writing-tools/shared';
import * as fs from 'node:fs/promises';

import { SettingsRepository } from './SettingsRepository';

// Mock node:fs/promises
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('SettingsRepository', () => {
  const testAppPath = '/tmp/test-app-data';
  let mockLogger: jest.Mocked<ILogger>;
  let repository: SettingsRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    repository = new SettingsRepository(mockLogger, testAppPath);
  });

  describe('loadSettings', () => {
    it('returns default settings when file does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Directory does not exist'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const settings = await repository.loadSettings();

      expect(settings).toEqual(DefaultSettings);
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('loads settings from existing file', async () => {
      const savedSettings: Partial<ISettings> = {
        provider: 'lmstudio',
        ollama: {
          address: 'http://custom:11434',
          model: 'custom-model',
          apiKey: 'key123',
        },
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(savedSettings));

      const settings = await repository.loadSettings();

      expect(settings.provider).toBe('lmstudio');
      expect(settings.ollama.address).toBe('http://custom:11434');
      expect(settings.ollama.model).toBe('custom-model');
      expect(settings.ollama.apiKey).toBe('key123');
      // Should merge with defaults for missing fields
      expect(settings.lmstudio).toEqual(DefaultSettings.lmstudio);
    });

    it('merges partial settings with defaults', async () => {
      const partialSettings = {
        provider: 'ollama',
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(partialSettings));

      const settings = await repository.loadSettings();

      expect(settings.provider).toBe('ollama');
      expect(settings.ollama).toEqual(DefaultSettings.ollama);
      expect(settings.lmstudio).toEqual(DefaultSettings.lmstudio);
      expect(settings.preconfiguredPrompts).toEqual(DefaultSettings.preconfiguredPrompts);
    });

    it('returns default settings when file is invalid JSON', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json {');

      const settings = await repository.loadSettings();

      expect(settings).toEqual(DefaultSettings);
    });

    it('returns cached settings on subsequent calls', async () => {
      const savedSettings: Partial<ISettings> = {
        provider: 'ollama',
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(savedSettings));

      const settings1 = await repository.loadSettings();
      const settings2 = await repository.loadSettings();

      expect(settings1).toEqual(settings2);
      // readFile should only be called once due to caching
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('creates directory if it does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Directory does not exist'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await repository.loadSettings();

      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('returns default settings on error', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const settings = await repository.loadSettings();

      expect(settings).toEqual(DefaultSettings);
    });
  });

  describe('saveSettings', () => {
    it('saves settings to file', async () => {
      const settings: ISettings = {
        ...DefaultSettings,
        provider: 'lmstudio',
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await repository.saveSettings(settings);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        JSON.stringify(settings, null, 2),
      );
    });

    it('updates in-memory cache after saving', async () => {
      const settings: ISettings = {
        ...DefaultSettings,
        provider: 'lmstudio',
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await repository.saveSettings(settings);

      // Load should return cached version
      const loaded = await repository.loadSettings();
      expect(loaded.provider).toBe('lmstudio');
    });

    it('creates directory if it does not exist', async () => {
      const settings: ISettings = DefaultSettings;

      (fs.access as jest.Mock).mockRejectedValue(new Error('Directory does not exist'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await repository.saveSettings(settings);

      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('throws error when save fails', async () => {
      const settings: ISettings = DefaultSettings;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await expect(repository.saveSettings(settings)).rejects.toThrow('Write failed');
    });
  });
});
