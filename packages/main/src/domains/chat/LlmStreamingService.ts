import type { IChatMessage, ILogger, IMessageStatistics } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import type { IModelService } from '../../domains/llm/IModelService';
import type { ISettingsService } from '../../domains/settings/ISettingsService';

import type { IChatService } from './IChatService';
import type { ILlmStreamingParams, ILlmStreamingResult, ILlmStreamingService } from './ILlmStreamingService';
import type { IMessageService } from './IMessageService';
import { LlmStreamingError } from './LlmStreamingError';

export class LlmStreamingService implements ILlmStreamingService {
  public constructor(
    private readonly chatService: IChatService,
    private readonly logger: ILogger,
    private readonly messageService: IMessageService,
    private readonly modelService: IModelService,
    private readonly settingsService: ISettingsService,
  ) {
    this.logger.info('LlmStreamingService initialized');
  }

  public async streamToWindow(params: ILlmStreamingParams): Promise<ILlmStreamingResult> {
    const { chatId, mainWindow, messages, override } = params;

    let fullContent = '';
    let statistics: IMessageStatistics | undefined;

    const chat = this.chatService.getChat(chatId);
    let streamOptions: { model: string, provider: 'ollama' | 'lmstudio' } | undefined;

    if (override?.model !== undefined && override.model !== '') {
      const settings = await this.settingsService.loadSettings();
      streamOptions = {
        model: override.model,
        provider: override.provider ?? (settings.provider ?? 'ollama'),
      };
    } else if (chat !== null) {
      streamOptions = {
        model: chat.model,
        provider: chat.provider as 'ollama' | 'lmstudio',
      };
    }

    const streamGenerator = this.modelService.sendMessagesStream(messages, streamOptions);

    try {
      for await (const chunk of streamGenerator) {
        fullContent += chunk.content;

        if (chunk.done && 'statistics' in chunk && chunk.statistics !== undefined) {
          statistics = chunk.statistics;
        }

        mainWindow.webContents.send(EIpcRendererEvent.CHAT_STREAM_CHUNK, {
          chatId,
          content: chunk.content,
          done: chunk.done,
          statistics: 'statistics' in chunk ? chunk.statistics : undefined,
        });
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Streaming error for chatId=%s: %s', String(chatId), errorText);

      throw new LlmStreamingError(errorText, fullContent);
    }

    const trimmedContent = fullContent.trimEnd();
    const assistantMessage: IChatMessage = {
      content: trimmedContent,
      id: `${Date.now().toString()}-response`,
      role: 'assistant',
      statistics,
      timestamp: new Date(),
    };

    try {
      this.messageService.saveMessage(chatId, assistantMessage);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save streamed assistant response: %s', errorText);
    }

    this.logger.info('Streaming completed for chatId=%s', String(chatId));

    return { fullContent: trimmedContent, statistics };
  }
}
