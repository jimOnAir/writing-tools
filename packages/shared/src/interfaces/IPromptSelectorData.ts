import type { IPreconfiguredPrompt } from './IPreconfiguredPrompt';

export interface IPromptSelectorData {
  preconfiguredPrompts: IPreconfiguredPrompt[];
  selectedText: string;
}
