import type { TIpcResponsePayload, TIpcEvent, IPreconfiguredPrompt, IPromptSelectedData, IChatMessage, TOpenTab, TChatResponse, IChatFollowUpQuestions, IChatStreamChunk, IChatStreamEnd } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';

import type { TIpcRenderListener } from '../../types/TIpcRenderListener';

/**
 * Interface for IPC communication abstraction
 * Provides type-safe IPC calls and event listeners
 */
export interface IIpcAdapter {
  /**
   * Invoke an IPC call to the main process
   */
  invoke: <T extends EIpcChannel, K extends EIpcEvent>(
    channel: T,
    data: TIpcEvent<T, K>,
  ) => Promise<TIpcResponsePayload<K>>;

  /**
   * Register a listener for prompt selected events
   */
  onPromptSelected: (callback: (data: IPromptSelectedData) => void) => TIpcRenderListener;

  /**
   * Unregister a prompt selected listener
   */
  offPromptSelected: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for Ollama response events
   */
  onOllamaResponse: (callback: (data: TChatResponse) => void) => TIpcRenderListener;

  /**
   * Unregister an Ollama response listener
   */
  offOllamaResponse: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for prompt selector data events
   */
  onPromptSelectorData: (
    callback: (data: { selectedText: string, preconfiguredPrompts: IPreconfiguredPrompt[] }) => void,
  ) => TIpcRenderListener;

  /**
   * Unregister a prompt selector data listener
   */
  offPromptSelectorData: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for chat title updated events
   */
  onChatTitleUpdated: (callback: (data: { chatId: number, title: string }) => void) => TIpcRenderListener;

  /**
   * Unregister a chat title updated listener
   */
  offChatTitleUpdated: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for chat load messages data events
   */
  onChatLoadMessagesData: (callback: (data: { chatId: number, messages: IChatMessage[] }) => void) => TIpcRenderListener;

  /**
   * Unregister a chat load messages data listener
   */
  offChatLoadMessagesData: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for chat created events
   */
  onChatCreated: (callback: (data: { chatId: number }) => void) => TIpcRenderListener;

  /**
   * Unregister a chat created listener
   */
  offChatCreated: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for chat deleted events
   */
  onChatDeleted: (callback: (data: { chatId: number }) => void) => TIpcRenderListener;

  /**
   * Unregister a chat deleted listener
   */
  offChatDeleted: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for chat stream chunk events
   */
  onChatStreamChunk: (callback: (data: IChatStreamChunk) => void) => TIpcRenderListener;

  /**
   * Unregister a chat stream chunk listener
   */
  offChatStreamChunk: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for chat stream end events
   */
  onChatStreamEnd: (callback: (data: IChatStreamEnd) => void) => TIpcRenderListener;

  /**
   * Unregister a chat stream end listener
   */
  offChatStreamEnd: (listener: TIpcRenderListener) => void;

  /**
   * Register a listener for chat follow-up questions events
   */
  onChatFollowUpQuestions: (callback: (data: IChatFollowUpQuestions) => void) => TIpcRenderListener;

  /**
   * Unregister a chat follow-up questions listener
   */
  offChatFollowUpQuestions: (listener: TIpcRenderListener) => void;
}

/**
 * Concrete implementation of IpcAdapter using window.electronAPI
 */
export class ElectronIpcAdapter implements IIpcAdapter {
  public async invoke<T extends EIpcChannel, K extends EIpcEvent>(
    channel: T,
    data: TIpcEvent<T, K>,
  ): Promise<TIpcResponsePayload<K>> {
    return this.getElectronAPI().invoke(channel, data);
  }

  public onPromptSelected(callback: (data: IPromptSelectedData) => void): TIpcRenderListener {
    return this.getElectronAPI().onPromptSelected(callback);
  }

  public offPromptSelected(listener: TIpcRenderListener): void {
    this.getElectronAPI().offPromptSelected(listener);
  }

  public onOllamaResponse(callback: (data: TChatResponse) => void): TIpcRenderListener {
    return this.getElectronAPI().onOllamaResponse(callback);
  }

  public offOllamaResponse(listener: TIpcRenderListener): void {
    this.getElectronAPI().offOllamaResponse(listener);
  }

  public onPromptSelectorData(
    callback: (data: { selectedText: string, preconfiguredPrompts: IPreconfiguredPrompt[] }) => void,
  ): TIpcRenderListener {
    return this.getElectronAPI().onPromptSelectorData(callback);
  }

  public offPromptSelectorData(listener: TIpcRenderListener): void {
    this.getElectronAPI().offPromptSelectorData(listener);
  }

  public onChatTitleUpdated(callback: (data: { chatId: number, title: string }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatTitleUpdated(callback);
  }

  public offChatTitleUpdated(listener: TIpcRenderListener): void {
    this.getElectronAPI().offChatTitleUpdated(listener);
  }

  public onChatLoadMessagesData(callback: (data: { chatId: number, messages: IChatMessage[] }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatLoadMessagesData(callback);
  }

  public offChatLoadMessagesData(listener: TIpcRenderListener): void {
    this.getElectronAPI().offChatLoadMessagesData(listener);
  }

  public onChatCreated(callback: (data: { chatId: number }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatCreated(callback);
  }

  public offChatCreated(listener: TIpcRenderListener): void {
    this.getElectronAPI().offChatCreated(listener);
  }

  public onChatDeleted(callback: (data: { chatId: number }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatDeleted(callback);
  }

  public offChatDeleted(listener: TIpcRenderListener): void {
    this.getElectronAPI().offChatDeleted(listener);
  }

  public async loadTabs(): Promise<{ scrollPositionsByChatId?: Record<number, number>, tabs: TOpenTab[] } | { error: string }> {
    const payload: TIpcEvent<EIpcChannel.TAB, EIpcEvent.TABS_LOAD> = {
      channel: EIpcChannel.TAB,
      event: EIpcEvent.TABS_LOAD,
      payload: {},
    };

    const response = await this.invoke(payload.channel, payload);

    if ('error' in response) {
      return { error: response.error };
    }

    return {
      scrollPositionsByChatId: response.scrollPositionsByChatId,
      tabs: response.tabs,
    };
  }

  public onChatStreamChunk(callback: (data: IChatStreamChunk) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatStreamChunk(callback);
  }

  public offChatStreamChunk(listener: TIpcRenderListener): void {
    this.getElectronAPI().offChatStreamChunk(listener);
  }

  public onChatStreamEnd(callback: (data: IChatStreamEnd) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatStreamEnd(callback);
  }

  public offChatStreamEnd(listener: TIpcRenderListener): void {
    this.getElectronAPI().offChatStreamEnd(listener);
  }

  public onChatFollowUpQuestions(callback: (data: IChatFollowUpQuestions) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatFollowUpQuestions(callback);
  }

  public offChatFollowUpQuestions(listener: TIpcRenderListener): void {
    this.getElectronAPI().offChatFollowUpQuestions(listener);
  }

  private getElectronAPI(): NonNullable<typeof window.electronAPI> {
    // Runtime check for electronAPI availability (may not be available in test environments)
    if (window.electronAPI === undefined) {
      throw new TypeError('electronAPI is not available');
    }

    return window.electronAPI;
  }
}
