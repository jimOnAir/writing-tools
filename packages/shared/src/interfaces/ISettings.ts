import type { IPreconfiguredPrompt } from './IPreconfiguredPrompt';

export interface ISettings {
  ollama: {
    address: string,
    model: string | undefined,
  };
  globalShortcut: string | undefined;
  preconfiguredPrompts: IPreconfiguredPrompt[];
}
