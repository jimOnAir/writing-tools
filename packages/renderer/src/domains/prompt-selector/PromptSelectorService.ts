import type { IPreconfiguredPrompt, TIpcEvent, IPromptSelectorData, ILogger } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';

/**
 * Service for managing prompt selector domain logic
 * Handles prompt selection, template processing, and IPC communication
 */
export class PromptSelectorService {
  private readonly ipcAdapter: IIpcAdapter;
  private readonly logger: ILogger;
  private selectedText = '';
  private preconfiguredPrompts: IPreconfiguredPrompt[] = [];
  private promptSelectorDataListener: TIpcRenderListener | null = null;

  // Callbacks for component state updates
  private onSelectedTextChange?: (text: string) => void;
  private onPromptsChange?: (prompts: IPreconfiguredPrompt[]) => void;

  public constructor(ipcAdapter: IIpcAdapter, logger: ILogger) {
    this.ipcAdapter = ipcAdapter;
    this.logger = logger;
  }

  /**
   * Register callbacks for state changes
   */
  public setCallbacks(callbacks: {
    onSelectedTextChange?: (text: string) => void,
    onPromptsChange?: (prompts: IPreconfiguredPrompt[]) => void,
  }): void {
    this.onSelectedTextChange = callbacks.onSelectedTextChange;
    this.onPromptsChange = callbacks.onPromptsChange;
  }

  /**
   * Initialize IPC listeners for prompt selector events
   */
  public initializeListeners(): void {
    const handlePromptSelectorData = (data: IPromptSelectorData) => {
      this.logger.info('Received prompt selector data');
      this.setSelectedText(data.selectedText);
      this.setPreconfiguredPrompts(data.preconfiguredPrompts);
    };

    try {
      this.promptSelectorDataListener = this.ipcAdapter.onPromptSelectorData(handlePromptSelectorData);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize prompt selector listeners: %s', errorText);
    }
  }

  /**
   * Cleanup IPC listeners
   */
  public cleanupListeners(): void {
    if (this.promptSelectorDataListener) {
      this.ipcAdapter.offPromptSelectorData(this.promptSelectorDataListener);
      this.promptSelectorDataListener = null;
    }
  }

  /**
   * Select a preconfigured prompt
   */
  public async selectPrompt(promptTemplate: string): Promise<void> {
    const prompt = this.processPromptTemplate(promptTemplate);

    const payload: TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT> = {
      channel: EIpcChannel.PROMPT_SELECTOR,
      event: EIpcEvent.PROMPT_SELECT,
      payload: {
        prompt,
      },
    };

    try {
      await this.ipcAdapter.invoke(EIpcChannel.PROMPT_SELECTOR, payload);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      this.logger.error('Error selecting prompt: %s', errorText);
      throw err;
    }
  }

  /**
   * Submit a custom prompt
   */
  public async submitCustomPrompt(customPrompt: string): Promise<void> {
    if (!customPrompt.trim()) {
      return;
    }

    const prompt = this.processPromptTemplate(customPrompt);

    const payload: TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT> = {
      channel: EIpcChannel.PROMPT_SELECTOR,
      event: EIpcEvent.PROMPT_SELECT,
      payload: {
        prompt,
      },
    };

    try {
      await this.ipcAdapter.invoke(EIpcChannel.PROMPT_SELECTOR, payload);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      this.logger.error('Error selecting prompt: %s', errorText);
      throw err;
    }
  }

  /**
   * Get selected text
   */
  public getSelectedText(): string {
    return this.selectedText;
  }

  /**
   * Get preconfigured prompts
   */
  public getPreconfiguredPrompts(): IPreconfiguredPrompt[] {
    return this.preconfiguredPrompts;
  }

  /**
   * Manually set prompt selector data
   * Useful when data arrives before the listener is set up, or to update data programmatically
   */
  public setPromptSelectorData(data: IPromptSelectorData): void {
    this.setSelectedText(data.selectedText);
    this.setPreconfiguredPrompts(data.preconfiguredPrompts);
  }

  /**
   * Process a prompt template by replacing {text} placeholder with selected text
   */
  private processPromptTemplate(template: string): string {
    let prompt = template;
    if (!prompt.includes('{text}')) {
      prompt += '\n{text}';
    }

    return prompt.replace(/\{text\}/gu, this.selectedText);
  }

  // Private setters that trigger callbacks
  private setSelectedText(text: string): void {
    this.selectedText = text;
    this.onSelectedTextChange?.(text);
  }

  private setPreconfiguredPrompts(prompts: IPreconfiguredPrompt[]): void {
    this.preconfiguredPrompts = prompts;
    this.onPromptsChange?.(prompts);
  }
}
