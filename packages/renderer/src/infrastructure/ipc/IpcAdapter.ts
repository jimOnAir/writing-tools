import type { EIpcChannel, TIpcResponsePayload, TIpcEvent, IPreconfiguredPrompt, EIpcEvent, IChatWindowData, IChatMessage } from '@writing-tools/shared';

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
  onOllamaResponse: (callback: (data?: any) => void) => TIpcRenderListener;

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
   * Register a listener for chat deleted events
   */
  onChatDeleted: (callback: (data: { chatId: number }) => void) => TIpcRenderListener;

  /**
   * Unregister a chat deleted listener
   */
  offChatDeleted: (listener: TIpcRenderListener) => void;
}

/**
 * Concrete implementation of IpcAdapter using window.electronAPI
 */
export class ElectronIpcAdapter implements IIpcAdapter {
  public async invoke<T extends EIpcChannel, K extends EIpcEvent>(
    channel: T,
    data: TIpcEvent<T, K>,
  ): Promise<TIpcResponsePayload<K>> {
    if (typeof window.electronAPI === 'undefined') {
      return Promise.reject(new Error('electronAPI is not available'));
    }

    return window.electronAPI.invoke(channel, data);
  }

  public onChatWindowData(callback: (data: IChatWindowData) => void): TIpcRenderListener {
    if (typeof window.electronAPI === 'undefined') {
      throw new Error('electronAPI is not available');
    }

    return window.electronAPI.onChatWindowData(callback);
  }

  public offChatWindowData(listener: TIpcRenderListener): void {
    if (typeof window.electronAPI === 'undefined') {
      return;
    }

    window.electronAPI.offChatWindowData(listener);
  }

  public onOllamaResponse(callback: (data?: any) => void): TIpcRenderListener {
    if (typeof window.electronAPI === 'undefined') {
      throw new Error('electronAPI is not available');
    }

    return window.electronAPI.onOllamaResponse(callback);
  }

  public offOllamaResponse(listener: TIpcRenderListener): void {
    if (typeof window.electronAPI === 'undefined') {
      return;
    }

    window.electronAPI.offOllamaResponse(listener);
  }

  public onPromptSelectorData(
    callback: (data: { selectedText: string, preconfiguredPrompts: IPreconfiguredPrompt[] }) => void,
  ): TIpcRenderListener {
    if (typeof window.electronAPI === 'undefined') {
      throw new Error('electronAPI is not available');
    }

    return window.electronAPI.onPromptSelectorData(callback);
  }

  public offPromptSelectorData(listener: TIpcRenderListener): void {
    if (typeof window.electronAPI === 'undefined') {
      return;
    }

    window.electronAPI.offPromptSelectorData(listener);
  }

  public onChatTitleUpdated(callback: (data: { chatId: number, title: string }) => void): TIpcRenderListener {
    if (typeof window.electronAPI === 'undefined') {
      throw new Error('electronAPI is not available');
    }

    return window.electronAPI.onChatTitleUpdated(callback);
  }

  public offChatTitleUpdated(listener: TIpcRenderListener): void {
    if (typeof window.electronAPI === 'undefined') {
      return;
    }

    window.electronAPI.offChatTitleUpdated(listener);
  }

  public onChatLoadMessagesData(callback: (data: { chatId: number, messages: IChatMessage[] }) => void): TIpcRenderListener {
    if (typeof window.electronAPI === 'undefined') {
      throw new Error('electronAPI is not available');
    }

    return window.electronAPI.onChatLoadMessagesData(callback);
  }

  public offChatLoadMessagesData(listener: TIpcRenderListener): void {
    if (typeof window.electronAPI === 'undefined') {
      return;
    }

    window.electronAPI.offChatLoadMessagesData(listener);
  }

  public onChatDeleted(callback: (data: { chatId: number }) => void): TIpcRenderListener {
    if (typeof window.electronAPI === 'undefined') {
      throw new Error('electronAPI is not available');
    }

    return window.electronAPI.onChatDeleted(callback);
  }

  public offChatDeleted(listener: TIpcRenderListener): void {
    if (typeof window.electronAPI === 'undefined') {
      return;
    }

    window.electronAPI.offChatDeleted(listener);
  }
}
