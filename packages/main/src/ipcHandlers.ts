import { EIpcChannel, EIpcEvent, logger } from '@writing-tools/shared';
import type { TIpcEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';
import os from 'os';

import { fetchOllamaModels, sendOllamaMessages } from './ollamaHandlers';
import { loadSettings, saveSettings } from './settings';
import { getChatWindow, getPromptSelectorWindow } from './windows';

type TChannelEventPayloadEnv = TIpcEvent<EIpcChannel.ENV, EIpcEvent.ENV_GET>;

type TSettingChannelEventPayload = TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD>
  | TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE>;

type TChannelEventPayloadModel = TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST>;

type TChatChannelEventPayload = TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SEND_MESSAGE>;

type TPromptSelectEventPayload = TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT>;

export function registerIpcHandlers() {
  ipcMain.handle(EIpcChannel.ENV, (_, _data: TChannelEventPayloadEnv) => {
    return {
      platform: os.platform(), // 'win32', 'darwin', 'linux'
      arch: os.arch(), // 'x64', 'arm64', etc.
      release: os.release(),
    };
  });

  ipcMain.handle(EIpcChannel.SETTINGS, (_, data: TSettingChannelEventPayload) => {
    const eventType = String((data as any).event);

    switch (data.event) {
      case EIpcEvent.SETTINGS_LOAD:
        return loadSettings();
      case EIpcEvent.SETTINGS_SAVE:
        try {
          saveSettings(data.payload);

          return;
        } catch (error: unknown) {
          const errorText = error instanceof Error
            ? error.message
            : String(error);

          return { success: false, error: errorText };
        }

      default:
        throw new Error(`Unsupported event: ${eventType}`);
    }
  });

  ipcMain.handle(EIpcChannel.MODEL, async (_, _data: TChannelEventPayloadModel) => {
    return fetchOllamaModels();
  });

  ipcMain.handle(EIpcChannel.CHAT, async (_, data: TChatChannelEventPayload) => {
    return sendOllamaMessages(data.payload.messages.map((message => {
      return {
        role: message.role,
        content: message.content,
      };
    })));
  });

  ipcMain.handle(EIpcChannel.PROMPT_SELECTOR, async (_, data: TPromptSelectEventPayload) => {
    const { prompt } = data.payload;

    const { window: promptSelectorWindow } = await getPromptSelectorWindow();

    promptSelectorWindow.close();

    const { window: chatWindow } = await getChatWindow();

    logger.info('Send chat-window-data: %s', prompt);
    chatWindow.webContents.send('chat-window-data', {
      prompt,
    });

    const response = await sendOllamaMessages([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    if (response.error) {
      logger.error('Ollama error: %s', response.error);

      chatWindow.webContents.send('ollama-response', {
        error: response.error,
      });

      return;
    }

    const result = response.response;
    chatWindow.webContents.send('ollama-response', {
      result,
    });
  });
}
