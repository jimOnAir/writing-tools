import type { ISettings } from '../interfaces/ISettings';

export const DefaultSettings: ISettings = Object.freeze({
  ollama: {
    address: 'http://localhost:11434',
    model: undefined,
    prompt: undefined,
  },
  globalShortcut: 'Ctrl+ALT+I',
});
