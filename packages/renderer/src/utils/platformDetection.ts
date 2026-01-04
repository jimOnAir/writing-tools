import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';

export type TPlatform = 'darwin' | 'win32' | 'linux';

let cachedPlatform: TPlatform | null = null;
let platformPromise: Promise<TPlatform> | null = null;

/**
 * Get the current platform (OS)
 * Caches the result after first detection
 * @returns Promise that resolves to the platform string
 */
export const getPlatform = async (): Promise<TPlatform> => {
  if (cachedPlatform !== null) {
    return Promise.resolve(cachedPlatform);
  }

  if (platformPromise !== null) {
    return platformPromise;
  }

  platformPromise = (async (): Promise<TPlatform> => {
    try {
      if (typeof window.electronAPI === 'undefined') {
        // Fallback to 'linux' if electronAPI is not available (e.g., during tests)
        cachedPlatform = 'linux';
        platformPromise = null;

        return 'linux';
      }

      const env = await window.electronAPI.invoke(EIpcChannel.ENV, {
        channel: EIpcChannel.ENV,
        event: EIpcEvent.ENV_GET,
        payload: {},
      });

      const platform = env.platform as TPlatform;

      if (platform === 'darwin' || platform === 'win32' || platform === 'linux') {
        cachedPlatform = platform;
        platformPromise = null;

        return platform;
      }

      // Fallback to 'linux' if platform is not recognized
      cachedPlatform = 'linux';
      platformPromise = null;

      return 'linux';
    } catch {
      // Fallback to 'linux' on error
      cachedPlatform = 'linux';
      platformPromise = null;

      return 'linux';
    }
  })();

  return platformPromise;
};

/**
 * Get the cached platform synchronously
 * Returns null if platform hasn't been detected yet
 */
export const getCachedPlatform = (): TPlatform | null => {
  return cachedPlatform;
};
