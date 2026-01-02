import type { IPreconfiguredPrompt } from './IPreconfiguredPrompt';

export interface ISettings {
  globalShortcut: string | undefined;
  lmstudio: {
    address: string,
    apiKey?: string,
    model: string | undefined,
  };
  ollama: {
    address: string,
    apiKey?: string,
    model: string | undefined,
  };
  preconfiguredPrompts: IPreconfiguredPrompt[];
  provider?: 'ollama' | 'lmstudio';
}
