import type { EIpcChannel, TIpcResponsePayload, TIpcEvent, IPreconfiguredPrompt, EIpcEvent } from '@writing-tools/shared';

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
  onChatWindowData: (callback: (data: { prompt: string }) => void) => TIpcRenderListener;

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

  public onChatWindowData(callback: (data: { prompt: string }) => void): TIpcRenderListener {
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
}
