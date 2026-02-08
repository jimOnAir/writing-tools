import type { IChatMessage, ILogger } from '@writing-tools/shared';

import type { IModelService } from '../llm';

const MAX_QUESTIONS = 5;

// TOOD: always send original message if it from prompt selector, or send all messages
export class FollowUpQuestionsService {
  public constructor(
    private readonly logger: ILogger,
    private readonly modelService: IModelService,
  ) {}

  public async generate(messages: IChatMessage[], chatId?: number | null): Promise<string[]> {
    if (messages.length < 2) {
      this.logger.debug('Follow-up questions skipped: need at least 2 messages (user + assistant), got %d', messages.length.toString());

      return [];
    }

    const lastUser = this.findLastMessageByRole(messages, 'user');
    const lastAssistant = this.findLastMessageByRole(messages, 'assistant');

    if (lastUser === undefined || lastAssistant === undefined) {
      this.logger.debug('Follow-up questions skipped: missing last user or assistant message');

      return [];
    }

    try {
      const prompt = this.buildPrompt(lastUser.content, lastAssistant.content);
      const response = await this.modelService.sendMessages([
        {
          content: prompt,
          role: 'user',
        },
      ], { maxTokens: 150 });

      if (!response.success) {
        this.logger.error('Failed to generate follow-up questions: %s', response.error);

        return [];
      }

      const questions = this.parseQuestions(response.response);

      this.logger.info('Generated %d follow-up questions for chatId=%s', questions.length.toString(), String(chatId ?? 'unknown'));

      return questions;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating follow-up questions: %s', errorText);

      return [];
    }
  }

  private findLastMessageByRole(messages: IChatMessage[], role: 'user' | 'assistant'): IChatMessage | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === role) {
        return messages[i];
      }
    }

    return undefined;
  }

  private buildPrompt(userContent: string, assistantContent: string): string {
    return `User asked: ${userContent}

Assistant replied: ${assistantContent}

Suggest 3–5 brief follow-up questions the user might ask next. One question per line, no numbering.`;
  }

  private parseQuestions(responseText: string): string[] {
    const lines = responseText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.slice(0, MAX_QUESTIONS);
  }
}
