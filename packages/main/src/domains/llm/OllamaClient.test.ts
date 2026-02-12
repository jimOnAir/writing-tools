import type { ILogger } from '@writing-tools/shared';
import type { Message } from 'ollama';
import { Ollama } from 'ollama';

import type { OllamaStreamChunk } from './OllamaClient';
import { OllamaClient } from './OllamaClient';

// Mock the ollama package
jest.mock('ollama', () => ({
  Ollama: jest.fn().mockImplementation(() => ({
    chat: jest.fn(),
    list: jest.fn(),
    show: jest.fn(),
  })),
}));

describe('OllamaClient', () => {
  let client: OllamaClient;
  let mockLogger: jest.Mocked<ILogger>;
  let mockOllamaInstance: {
    chat: jest.Mock,
    list: jest.Mock,
    show: jest.Mock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockOllamaInstance = {
      chat: jest.fn(),
      list: jest.fn(),
      show: jest.fn(),
    };

    (Ollama as jest.Mock).mockImplementation(() => mockOllamaInstance);

    client = new OllamaClient({
      host: 'http://localhost:11434',
    }, mockLogger);
  });

  describe('chat', () => {
    it('sends chat message successfully', async () => {
      const mockResponse = {
        message: {
          content: 'Test response from Ollama',
        },
      };

      mockOllamaInstance.chat.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await client.chat('test-model', messages);

      expect(result).toEqual({
        response: 'Test response from Ollama',
        success: true,
      });
      expect(mockOllamaInstance.chat).toHaveBeenCalledWith({
        model: 'test-model',
        messages,
        stream: false,
      });
      expect(Ollama).toHaveBeenCalledWith({ host: 'http://localhost:11434' });
    });

    it('handles chat errors', async () => {
      const error = new Error('Connection refused');
      mockOllamaInstance.chat.mockRejectedValue(error);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await client.chat('test-model', messages);

      expect(result).toEqual({
        error: 'Connection refused',
        success: false,
      });
    });

    it('handles non-Error exceptions', async () => {
      mockOllamaInstance.chat.mockRejectedValue('String error');

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await client.chat('test-model', messages);

      expect(result).toEqual({
        error: 'String error',
        success: false,
      });
    });

    it('uses custom host from config', async () => {
      const customClient = new OllamaClient({
        host: 'http://custom-host:11434',
      }, mockLogger);

      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
      });

      await customClient.chat('model', []);

      expect(Ollama).toHaveBeenCalledWith({ host: 'http://custom-host:11434' });
    });
  });

  describe('listModels', () => {
    it('fetches list of models successfully', async () => {
      const mockResponse = {
        models: [
          { name: 'llama2' },
          { name: 'mistral' },
          { name: 'codellama' },
        ],
      };

      mockOllamaInstance.list.mockResolvedValue(mockResponse);

      const result = await client.listModels();

      expect(result).toEqual({
        models: ['llama2', 'mistral', 'codellama'],
      });
      expect(mockOllamaInstance.list).toHaveBeenCalled();
      expect(Ollama).toHaveBeenCalledWith({ host: 'http://localhost:11434' });
    });

    it('handles list errors', async () => {
      const error = new Error('Connection refused');
      mockOllamaInstance.list.mockRejectedValue(error);

      const result = await client.listModels();

      expect(result).toEqual({ error: 'Connection refused', models: [] });
    });

    it('handles non-Error exceptions', async () => {
      mockOllamaInstance.list.mockRejectedValue('String error');

      const result = await client.listModels();

      expect(result).toEqual({ error: 'String error', models: [] });
    });

    it('returns empty array when no models available', async () => {
      mockOllamaInstance.list.mockResolvedValue({ models: [] });

      const result = await client.listModels();

      expect(result).toEqual({ models: [] });
    });

    it('uses custom host from config', async () => {
      const customClient = new OllamaClient({
        host: 'http://custom-host:11434',
      }, mockLogger);

      mockOllamaInstance.list.mockResolvedValue({ models: [] });

      await customClient.listModels();

      expect(Ollama).toHaveBeenCalledWith({ host: 'http://custom-host:11434' });
    });
  });

  describe('getModelContextLength', () => {
    it('returns num_ctx when parameters string contains it', async () => {
      mockOllamaInstance.show.mockResolvedValue({
        parameters: 'temperature 0.7\nnum_ctx 4096\n',
      });

      const result = await client.getModelContextLength('llama2');

      expect(result).toBe(4096);
      expect(mockOllamaInstance.show).toHaveBeenCalledWith({ model: 'llama2' });
    });

    it('returns null when model is empty string', async () => {
      const result = await client.getModelContextLength('   ');

      expect(result).toBe(null);
      expect(mockOllamaInstance.show).not.toHaveBeenCalled();
    });

    it('returns null when parameters missing num_ctx', async () => {
      mockOllamaInstance.show.mockResolvedValue({ parameters: 'temperature 0.7' });

      const result = await client.getModelContextLength('llama2');

      expect(result).toBe(null);
    });

    it('returns null on show error', async () => {
      mockOllamaInstance.show.mockRejectedValue(new Error('Model not found'));

      const result = await client.getModelContextLength('llama2');

      expect(result).toBe(null);
    });
  });

  describe('chatStream', () => {
    it('streams chat responses successfully', async () => {
      // Create async iterator mock for streaming
      const mockStreamResponse = (async function* () {
        yield Promise.resolve({ message: { content: 'Hello' }, done: false });
        yield Promise.resolve({ message: { content: ' world' }, done: false });
        yield Promise.resolve({ message: { content: '!' }, done: true });
      })();

      mockOllamaInstance.chat.mockResolvedValue(mockStreamResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks: OllamaStreamChunk[] = [];
      for await (const chunk of client.chatStream('test-model', messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { content: 'Hello', done: false },
        { content: ' world', done: false },
        { content: '!', done: true },
      ]);
      expect(mockOllamaInstance.chat).toHaveBeenCalledWith({
        model: 'test-model',
        messages,
        stream: true,
      });
    });

    it('handles streaming errors', async () => {
      const error = new Error('Stream error');
      mockOllamaInstance.chat.mockRejectedValue(error);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(async () => {
        const chunks: OllamaStreamChunk[] = [];
        for await (const chunk of client.chatStream('test-model', messages)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Stream error');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles empty stream', async () => {
      const mockStreamResponse = (async function* () {
        // Empty stream
      })();

      mockOllamaInstance.chat.mockResolvedValue(mockStreamResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks: OllamaStreamChunk[] = [];
      for await (const chunk of client.chatStream('test-model', messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });
  });
});
