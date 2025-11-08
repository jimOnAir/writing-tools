import type { IPreconfiguredPrompt } from './IPreconfiguredPrompt';

export interface IPromptSelectorData {
  selectedText: string;
  preconfiguredPrompts: IPreconfiguredPrompt[];
}
