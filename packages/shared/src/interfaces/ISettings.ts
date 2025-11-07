export interface ISettings {
  ollama: {
    address: string;
    model: string | undefined;
    prompt: string | undefined;
  };
  globalShortcut: string | undefined;
}
