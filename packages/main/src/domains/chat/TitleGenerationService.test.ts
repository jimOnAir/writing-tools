import type { ILogger } from '@writing-tools/shared';

import type { IChatService } from './IChatService';
import type { IMessageService } from './IMessageService';
import type { ITitleGenerationService } from './ITitleGenerationService';

import { TitleGenerationService } from './TitleGenerationService';

describe('TitleGenerationService', () => {
  let mockChatService: jest.Mocked<IChatService>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockMessageService: jest.Mocked<IMessageService>;
  let mockModelService: { sendMessages: jest.Mock };
  let titleGenerationService: ITitleGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatService = {
      getChat: jest.fn(),
      updateChatTitle: jest.fn(),
    } as unknown as jest.Mocked<IChatService>;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockMessageService = {
      loadChatMessages: jest.fn(),
    } as unknown as jest.Mocked<IMessageService>;

    mockModelService = {
      sendMessages: jest.fn(),
    };

    titleGenerationService = new TitleGenerationService(
      mockChatService,
      mockLogger,
      mockMessageService,
      mockModelService as never,
    );
  });

  describe('regenerateTitle', () => {
    it('returns null when fewer than 2 messages', async () => {
      mockMessageService.loadChatMessages.mockReturnValue([
        { id: 1, role: 'user', content: 'Hi', timestamp: new Date() },
      ]);

      const result = await titleGenerationService.regenerateTitle(1);

      expect(result).toBeNull();
      expect(mockChatService.getChat).not.toHaveBeenCalled();
      expect(mockModelService.sendMessages).not.toHaveBeenCalled();
      expect(mockChatService.updateChatTitle).not.toHaveBeenCalled();
    });

    it('returns null when chat not found', async () => {
      mockMessageService.loadChatMessages.mockReturnValue([
        { id: 1, role: 'user', content: 'Hi', timestamp: new Date() },
        { id: 2, role: 'assistant', content: 'Hello', timestamp: new Date() },
      ]);
      mockChatService.getChat.mockReturnValue(null);

      const result = await titleGenerationService.regenerateTitle(1);

      expect(result).toBeNull();
      expect(mockModelService.sendMessages).not.toHaveBeenCalled();
      expect(mockChatService.updateChatTitle).not.toHaveBeenCalled();
    });

    it('returns generated title and does not save to DB', async () => {
      mockMessageService.loadChatMessages.mockReturnValue([
        { id: 1, role: 'user', content: 'Hi', timestamp: new Date() },
        { id: 2, role: 'assistant', content: 'Hello', timestamp: new Date() },
      ]);
      mockChatService.getChat.mockReturnValue({
        id: 1,
        title: 'Old',
        provider: 'ollama',
        model: 'test',
        created_at: '',
        updated_at: '',
      });
      mockModelService.sendMessages.mockResolvedValue({
        success: true,
        response: 'Friendly Greeting',
      });

      const result = await titleGenerationService.regenerateTitle(1);

      expect(result).toBe('Friendly Greeting');
      expect(mockModelService.sendMessages).toHaveBeenCalledTimes(1);
      expect(mockChatService.updateChatTitle).not.toHaveBeenCalled();
    });

    it('uses first 6 messages for context', async () => {
      const messages = [
        { id: 1, role: 'user', content: 'A', timestamp: new Date() },
        { id: 2, role: 'assistant', content: 'B', timestamp: new Date() },
        { id: 3, role: 'user', content: 'C', timestamp: new Date() },
        { id: 4, role: 'assistant', content: 'D', timestamp: new Date() },
      ];
      mockMessageService.loadChatMessages.mockReturnValue(messages);
      mockChatService.getChat.mockReturnValue({
        id: 1,
        title: '',
        provider: 'ollama',
        model: 'test',
        created_at: '',
        updated_at: '',
      });
      mockModelService.sendMessages.mockResolvedValue({
        success: true,
        response: 'Multi-turn Chat',
      });

      const result = await titleGenerationService.regenerateTitle(1);

      expect(result).toBe('Multi-turn Chat');
      const call = mockModelService.sendMessages.mock.calls[0];
      expect(call).toBeDefined();
      const prompt = call?.[0]?.[0]?.content as string;
      expect(prompt).toContain('User: A');
      expect(prompt).toContain('Assistant: B');
      expect(prompt).toContain('User: C');
      expect(prompt).toContain('Assistant: D');
    });

    it('returns null when model returns empty title', async () => {
      mockMessageService.loadChatMessages.mockReturnValue([
        { id: 1, role: 'user', content: 'Hi', timestamp: new Date() },
        { id: 2, role: 'assistant', content: 'Hello', timestamp: new Date() },
      ]);
      mockChatService.getChat.mockReturnValue({
        id: 1,
        title: '',
        provider: 'ollama',
        model: 'test',
        created_at: '',
        updated_at: '',
      });
      mockModelService.sendMessages.mockResolvedValue({
        success: true,
        response: '   ',
      });

      const result = await titleGenerationService.regenerateTitle(1);

      expect(result).toBeNull();
    });
  });
});
