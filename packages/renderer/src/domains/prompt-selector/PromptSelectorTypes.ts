import type { IPreconfiguredPrompt } from '@writing-tools/shared';

// Domain-specific types for prompt selector
// Most types are imported from @writing-tools/shared
// This file is reserved for any prompt-selector-domain-specific type extensions

export type PromptSelectorServiceCallbacks = {
  onSelectedTextChange?: (text: string) => void,
  onPromptsChange?: (prompts: IPreconfiguredPrompt[]) => void,
};
