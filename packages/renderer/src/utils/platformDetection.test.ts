import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';

describe('platformDetection', () => {
  let mockElectronAPI: { invoke: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Create fresh mock for each test
    mockElectronAPI = {
      invoke: jest.fn(),
    };

    // eslint-disable-next-line sonarjs/prefer-global-this
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // eslint-disable-next-line sonarjs/prefer-global-this
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  describe('getPlatform', () => {
    it('returns darwin when platform is darwin', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ platform: 'darwin' });

      const { getPlatform } = await import('./platformDetection');
      const platform = await getPlatform();

      expect(platform).toBe('darwin');
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(EIpcChannel.ENV, {
        channel: EIpcChannel.ENV,
        event: EIpcEvent.ENV_GET,
        payload: {},
      });
    });

    it('returns win32 when platform is win32', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ platform: 'win32' });

      const { getPlatform } = await import('./platformDetection');
      const platform = await getPlatform();

      expect(platform).toBe('win32');
    });

    it('returns linux when platform is linux', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ platform: 'linux' });

      const { getPlatform } = await import('./platformDetection');
      const platform = await getPlatform();

      expect(platform).toBe('linux');
    });

    it('returns linux when platform is unrecognized', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ platform: 'unknown' });

      const { getPlatform } = await import('./platformDetection');
      const platform = await getPlatform();

      expect(platform).toBe('linux');
    });

    it('returns linux when electronAPI is unavailable', async () => {
      // eslint-disable-next-line sonarjs/prefer-global-this
      delete (window as { electronAPI?: unknown }).electronAPI;

      const { getPlatform } = await import('./platformDetection');
      const platform = await getPlatform();

      expect(platform).toBe('linux');
    });

    it('returns linux on error', async () => {
      mockElectronAPI.invoke.mockRejectedValue(new Error('Network error'));

      const { getPlatform } = await import('./platformDetection');
      const platform = await getPlatform();

      expect(platform).toBe('linux');
    });

    it('caches platform after first call', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ platform: 'darwin' });

      const { getPlatform } = await import('./platformDetection');
      const platform1 = await getPlatform();
      const platform2 = await getPlatform();

      expect(platform1).toBe('darwin');
      expect(platform2).toBe('darwin');
      // Should only call invoke once due to caching
      expect(mockElectronAPI.invoke).toHaveBeenCalledTimes(1);
    });

    it('returns same promise for concurrent calls', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ platform: 'win32' });

      const { getPlatform } = await import('./platformDetection');
      const promise1 = getPlatform();
      const promise2 = getPlatform();

      expect(promise1).toBe(promise2);

      const platform1 = await promise1;
      const platform2 = await promise2;

      expect(platform1).toBe('win32');
      expect(platform2).toBe('win32');
      expect(mockElectronAPI.invoke).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCachedPlatform', () => {
    it('returns null when platform has not been detected', () => {
      const { getCachedPlatform } = require('./platformDetection');
      const cached = getCachedPlatform();

      expect(cached).toBeNull();
    });

    it('returns cached platform after detection', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ platform: 'darwin' });

      const { getPlatform, getCachedPlatform } = await import('./platformDetection');
      await getPlatform();
      const cached = getCachedPlatform();

      expect(cached).toBe('darwin');
    });
  });
});
