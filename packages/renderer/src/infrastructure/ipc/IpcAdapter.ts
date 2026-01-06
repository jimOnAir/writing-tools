import type { TIpcResponsePayload, TIpcEvent, IPreconfiguredPrompt, IChatWindowData, IChatMessage, TOpenTab, TChatResponse } from '@writing-tools/shared';
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
   * Register a listener for chat window data events
   */
  onChatWindowData: (callback: (data: IChatWindowData) => void) => TIpcRenderListener;

  /**
   * Unregister a chat window data listener
   */
  offChatWindowData: (listener: TIpcRenderListener) => void;

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
   * Register a listener for chat save tabs request events
   */
  onChatSaveTabsRequest: (callback: () => void) => TIpcRenderListener;

  /**
   * Unregister a chat save tabs request listener
   */
  offChatSaveTabsRequest: (listener: TIpcRenderListener) => void;

  /**
   * Save tabs to main process
   */
  saveTabs: (tabs: TOpenTab[]) => Promise<{ success: true } | { error: string, success: false }>;

  /**
   * Load tabs from main process
   */
  loadTabs: () => Promise<{ tabs: TOpenTab[] } | { error: string }>;
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

  public onChatWindowData(callback: (data: IChatWindowData) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatWindowData(callback);
  }

  public offChatWindowData(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offChatWindowData(listener);
  }

  public onOllamaResponse(callback: (data: TChatResponse) => void): TIpcRenderListener {
    return this.getElectronAPI().onOllamaResponse(callback);
  }

  public offOllamaResponse(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offOllamaResponse(listener);
  }

  public onPromptSelectorData(
    callback: (data: { selectedText: string, preconfiguredPrompts: IPreconfiguredPrompt[] }) => void,
  ): TIpcRenderListener {
    return this.getElectronAPI().onPromptSelectorData(callback);
  }

  public offPromptSelectorData(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offPromptSelectorData(listener);
  }

  public onChatTitleUpdated(callback: (data: { chatId: number, title: string }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatTitleUpdated(callback);
  }

  public offChatTitleUpdated(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offChatTitleUpdated(listener);
  }

  public onChatLoadMessagesData(callback: (data: { chatId: number, messages: IChatMessage[] }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatLoadMessagesData(callback);
  }

  public offChatLoadMessagesData(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offChatLoadMessagesData(listener);
  }

  public onChatCreated(callback: (data: { chatId: number }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatCreated(callback);
  }

  public offChatCreated(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offChatCreated(listener);
  }

  public onChatDeleted(callback: (data: { chatId: number }) => void): TIpcRenderListener {
    return this.getElectronAPI().onChatDeleted(callback);
  }

  public offChatDeleted(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offChatDeleted(listener);
  }

  public onChatSaveTabsRequest(callback: () => void): TIpcRenderListener {
    return this.getElectronAPI().onChatSaveTabsRequest(callback);
  }

  public offChatSaveTabsRequest(listener: TIpcRenderListener): void {
    (window as { electronAPI?: typeof window.electronAPI }).electronAPI?.offChatSaveTabsRequest(listener);
  }

  public async saveTabs(tabs: TOpenTab[]): Promise<{ success: true } | { error: string, success: false }> {
    const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SAVE_TABS> = {
      channel: EIpcChannel.CHAT,
      event: EIpcEvent.CHAT_SAVE_TABS,
      payload: { tabs },
    };

    const response = await this.invoke(EIpcChannel.CHAT, payload);

    if ('error' in response) {
      return { error: response.error, success: false };
    }

    return { success: true };
  }

  public async loadTabs(): Promise<{ tabs: TOpenTab[] } | { error: string }> {
    const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LOAD_TABS> = {
      channel: EIpcChannel.CHAT,
      event: EIpcEvent.CHAT_LOAD_TABS,
      payload: {},
    };

    const response = await this.invoke(EIpcChannel.CHAT, payload);

    if ('error' in response) {
      return { error: response.error };
    }

    return { tabs: response.tabs };
  }

  private getElectronAPI(): NonNullable<typeof window.electronAPI> {
    // Runtime check for electronAPI availability (may not be available in test environments)
    if (window.electronAPI === undefined) {
      throw new TypeError('electronAPI is not available');
    }

    return window.electronAPI;
  }
}
