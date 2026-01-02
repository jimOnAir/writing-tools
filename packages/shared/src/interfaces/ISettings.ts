import type { IPreconfiguredPrompt } from './IPreconfiguredPrompt';

export interface ISettings {
  provider?: 'ollama' | 'lmstudio';
  ollama: {
    address: string,
    model: string | undefined,
    apiKey?: string,
  };
  lmstudio: {
    address: string,
    model: string | undefined,
    apiKey?: string,
  };
  globalShortcut: string | undefined;
  preconfiguredPrompts: IPreconfiguredPrompt[];
}
