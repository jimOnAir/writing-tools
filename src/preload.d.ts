// Type definitions for preload script
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, data?: any) => Promise<any>;
      send: (channel: string, data?: any) => void;
      on: (channel: string, callback: (data?: any) => void) => void;
    };
  }
}

export {};
