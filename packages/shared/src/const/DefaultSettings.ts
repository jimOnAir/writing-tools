import type { ISettings } from '../interfaces/ISettings';

export const DefaultSettings: ISettings = Object.freeze({
  provider: 'ollama',
  ollama: {
    address: 'http://localhost:11434',
    model: undefined,
    apiKey: undefined,
  },
  lmstudio: {
    address: 'http://localhost:1234',
    model: undefined,
    apiKey: undefined,
  },
  globalShortcut: 'Ctrl+ALT+I',
  preconfiguredPrompts: [
    {
      title: 'Summarize',
      prompt: 'Summarize the following text in one sentence: {text}',
    },
    {
      title: 'Explain',
      prompt: 'Explain the following text in simple terms: {text}',
    },
    {
      title: 'Translate',
      prompt: 'Translate the following text to English: {text}',
    },
  ],
});
