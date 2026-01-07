export interface IPreconfiguredPrompt {
  icon?: string;
  model?: string;
  provider?: 'ollama' | 'lmstudio';
  prompt: string;
  title: string;
}
