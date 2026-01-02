import type { ISettings } from '../interfaces/ISettings';

export const DefaultSettings: ISettings = Object.freeze({
  globalShortcut: 'Ctrl+ALT+I',
  lmstudio: {
    address: 'http://localhost:1234',
    apiKey: undefined,
    model: undefined,
  },
  ollama: {
    address: 'http://localhost:11434',
    apiKey: undefined,
    model: undefined,
  },
  preconfiguredPrompts: [
    {
      icon: undefined,
      prompt: 'Summarize the following text in one sentence: {text}',
      title: 'Summarize',
    },
    {
      icon: undefined,
      prompt: 'Explain the following text in simple terms: {text}',
      title: 'Explain',
    },
    {
      icon: undefined,
      prompt: 'Translate the following text to English: {text}',
      title: 'Translate',
    },
  ],
  provider: 'ollama',
});
