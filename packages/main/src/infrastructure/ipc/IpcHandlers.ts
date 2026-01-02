import { EIpcChannel, EIpcEvent, EIpcRendererEvent, logger } from '@writing-tools/shared';
import type { TIpcEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';
import os from 'os';

import { ModelService } from '../../domains/llm';
import { SettingsService } from '../../domains/settings';
import { WindowService } from '../../domains/windows';

type TChannelEventPayloadEnv = TIpcEvent<EIpcChannel.ENV, EIpcEvent.ENV_GET>;

type TSettingChannelEventPayload = TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD>
  | TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE>;

type TChannelEventPayloadModel = TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST>;

type TChatChannelEventPayload = TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SEND_MESSAGE>;

type TPromptSelectEventPayload = TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT>;

export class IpcHandlers {
  private readonly settingsService: SettingsService;
  private readonly modelService: ModelService;
  private readonly windowService: WindowService;

  public constructor(
    settingsService: SettingsService = new SettingsService(),
    modelService: ModelService = new ModelService(),
    windowService: WindowService = new WindowService(),
  ) {
    this.settingsService = settingsService;
    this.modelService = modelService;
    this.windowService = windowService;
  }

  public register(): void {
    ipcMain.handle(EIpcChannel.ENV, (_, _data: TChannelEventPayloadEnv) => {
      return {
        platform: os.platform(), // 'win32', 'darwin', 'linux'
        arch: os.arch(), // 'x64', 'arm64', etc.
        release: os.release(),
      };
    });

    ipcMain.handle(EIpcChannel.SETTINGS, async (_, data: TSettingChannelEventPayload) => {
      const eventType = String((data as any).event);

      switch (data.event) {
        case EIpcEvent.SETTINGS_LOAD:
          return await this.settingsService.loadSettings();
        case EIpcEvent.SETTINGS_SAVE:
          try {
            await this.settingsService.saveSettings(data.payload);

            return { success: true };
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

    ipcMain.handle(EIpcChannel.MODEL, async (_, data: TChannelEventPayloadModel) => {
      return this.modelService.fetchModels(data.payload.provider);
    });

    ipcMain.handle(EIpcChannel.CHAT, async (_, data: TChatChannelEventPayload) => {
      return this.modelService.sendMessages(data.payload.messages.map((message => {
        return {
          role: message.role,
          content: message.content,
        };
      })));
    });

    ipcMain.handle(EIpcChannel.PROMPT_SELECTOR, async (_, data: TPromptSelectEventPayload) => {
      const { prompt } = data.payload;

      const { window: promptSelectorWindow } = await this.windowService.getPromptSelectorWindow();

      promptSelectorWindow.close();

      const { window: chatWindow } = await this.windowService.getChatWindow();

      logger.info('Send chat-window-data: %s', prompt);
      chatWindow.webContents.send(EIpcRendererEvent.CHAT_WINDOW_DATA, {
        prompt,
      });

      const response = await this.modelService.sendMessages([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      if (response.error) {
        logger.error('LLM error: %s', response.error);

        chatWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
          error: response.error,
        });

        return;
      }

      const result = response.response;
      chatWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
        result,
      });
    });
  }
}
