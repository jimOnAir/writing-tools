// Type definitions for preload script
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, data?: any) => Promise<any>;
      send: (channel: string, data?: any) => void;
      onChatWindowData: (callback: (data?: any) => void) => void;
      offChatWindowData: (callback: (data?: any) => void) => void;
      onOllamaResponse: (callback: (data?: any) => void) => void;
      offOllamaResponse: (callback: (data?: any) => void) => void;
    };
  }
}

export {};
