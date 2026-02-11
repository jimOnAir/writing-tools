import type { ILogger } from '@writing-tools/shared';
import nock from 'nock';

import type { LMStudioStreamChunk } from './LMStudioClient';
import { LMStudioClient } from './LMStudioClient';

// HTTP status codes
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

interface LMStudioChatRequestBody {
  model: string;
  messages: Array<{ content: string, role: string }>;
  stream: boolean;
}

describe('LMStudioClient', () => {
  let client: LMStudioClient;
  let mockLogger: jest.Mocked<ILogger>;
  const baseUrl = 'http://localhost:1234';

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    client = new LMStudioClient({
      host: baseUrl,
    }, mockLogger);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('chat', () => {
    it('sends chat message successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response from LM Studio',
            },
          },
        ],
      };

      nock(baseUrl)
        .post('/v1/chat/completions')
        .reply(HTTP_OK, mockResponse);

      const result = await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toEqual({
        response: 'Test response from LM Studio',
        success: true,
      });
    });

    it('includes Authorization header when apiKey is provided', async () => {
      const clientWithKey = new LMStudioClient({
        host: baseUrl,
        apiKey: 'test-api-key',
      }, mockLogger);

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
            },
          },
        ],
      };

      nock(baseUrl)
        .post('/v1/chat/completions', (body: unknown) => {
          const requestBody = body as LMStudioChatRequestBody;

          return requestBody.model === 'test-model';
        })
        .matchHeader('Authorization', 'Bearer test-api-key')
        .matchHeader('Content-Type', 'application/json')
        .reply(HTTP_OK, mockResponse);

      await clientWithKey.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(nock.isDone()).toBe(true);
    });

    it('sends correct request body', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
            },
          },
        ],
      };

      nock(baseUrl)
        .post('/v1/chat/completions', (body: unknown) => {
          const requestBody = body as LMStudioChatRequestBody;
          const isModelMatch = requestBody.model === 'test-model';
          const isMessagesLengthMatch = requestBody.messages.length === 1;
          const isFirstMessageRoleMatch = requestBody.messages[0]?.role === 'user';
          const isFirstMessageContentMatch = requestBody.messages[0]?.content === 'Hello';
          const isStreamMatch = !requestBody.stream;

          return isModelMatch && isMessagesLengthMatch && isFirstMessageRoleMatch && isFirstMessageContentMatch && isStreamMatch;
        })
        .reply(HTTP_OK, mockResponse);

      await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(nock.isDone()).toBe(true);
    });

    it('handles HTTP errors', async () => {
      nock(baseUrl)
        .post('/v1/chat/completions')
        .reply(HTTP_INTERNAL_SERVER_ERROR, { error: 'Internal server error' });

      const result = await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.stringContaining('HTTP 500'),
        success: false,
      });
    });

    it('extracts statistics from usage in response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response with stats',
            },
          },
        ],
        model: 'test-model',
        usage: {
          completion_tokens: 50,
          prompt_tokens: 20,
          total_tokens: 70,
        },
      };

      nock(baseUrl)
        .post('/v1/chat/completions')
        .reply(HTTP_OK, mockResponse);

      const result = await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toMatchObject({
        response: 'Response with stats',
        statistics: {
          generatedAt: expect.any(Date),
          lmstudio: {
            completionTokens: 50,
            promptTokens: 20,
            totalTokens: 70,
          },
          model: 'test-model',
          provider: 'lmstudio',
        },
        success: true,
      });
    });

    it('extracts statistics from stats field when usage is absent (LM Studio native format)', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
            },
          },
        ],
        model: 'test-model',
        stats: {
          input_tokens: 15,
          total_output_tokens: 25,
        },
      };

      nock(baseUrl)
        .post('/v1/chat/completions')
        .reply(HTTP_OK, mockResponse);

      const result = await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toMatchObject({
        response: 'Response',
        statistics: {
          generatedAt: expect.any(Date),
          lmstudio: {
            completionTokens: 25,
            promptTokens: 15,
            totalTokens: 40,
          },
          model: 'test-model',
          provider: 'lmstudio',
        },
        success: true,
      });
    });

    it('handles empty choices array', async () => {
      nock(baseUrl)
        .post('/v1/chat/completions')
        .reply(HTTP_OK, { choices: [] });

      const result = await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toEqual({
        error: 'No response from LM Studio',
        success: false,
      });
    });

    it('handles network errors', async () => {
      nock(baseUrl)
        .post('/v1/chat/completions')
        .replyWithError('Network error');

      const result = await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toEqual({
        error: 'Network error',
        success: false,
      });
    });

    it('handles connection refused errors', async () => {
      nock(baseUrl)
        .post('/v1/chat/completions')
        .replyWithError('Connection refused');

      const result = await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toMatchObject({
        error: 'Connection refused',
        success: false,
      });
    });
  });

  describe('listModels', () => {
    it('fetches list of models successfully', async () => {
      const mockResponse = {
        data: [
          { id: 'model-1' },
          { id: 'model-2' },
          { id: 'model-3' },
        ],
      };

      nock(baseUrl)
        .get('/v1/models')
        .reply(HTTP_OK, mockResponse);

      const result = await client.listModels();

      expect(result).toEqual({
        models: ['model-1', 'model-2', 'model-3'],
      });
    });

    it('includes Authorization header when apiKey is provided', async () => {
      const clientWithKey = new LMStudioClient({
        host: baseUrl,
        apiKey: 'test-api-key',
      }, mockLogger);

      const mockResponse = {
        data: [{ id: 'model-1' }],
      };

      nock(baseUrl)
        .get('/v1/models')
        .matchHeader('Authorization', 'Bearer test-api-key')
        .matchHeader('Content-Type', 'application/json')
        .reply(HTTP_OK, mockResponse);

      await clientWithKey.listModels();

      expect(nock.isDone()).toBe(true);
    });

    it('returns empty array when no models available', async () => {
      nock(baseUrl)
        .get('/v1/models')
        .reply(HTTP_OK, { data: [] });

      const result = await client.listModels();

      expect(result).toEqual({ models: [] });
    });

    it('handles HTTP errors', async () => {
      nock(baseUrl)
        .get('/v1/models')
        .reply(HTTP_NOT_FOUND, { error: 'Not found' });

      const result = await client.listModels();

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.stringContaining('HTTP 404'),
        models: [],
      });
    });

    it('handles network errors', async () => {
      nock(baseUrl)
        .get('/v1/models')
        .replyWithError('Network error');

      const result = await client.listModels();

      expect(result).toEqual({
        error: 'Network error',
        models: [],
      });
    });

    it('handles connection refused errors', async () => {
      nock(baseUrl)
        .get('/v1/models')
        .replyWithError('Connection refused');

      const result = await client.listModels();

      expect(result).toMatchObject({
        error: 'Connection refused',
        models: [],
      });
    });
  });

  describe('getHeaders', () => {
    it('includes Content-Type header', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
            },
          },
        ],
      };

      nock(baseUrl)
        .post('/v1/chat/completions')
        .matchHeader('Content-Type', 'application/json')
        .reply(HTTP_OK, mockResponse);

      await client.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(nock.isDone()).toBe(true);
    });

    it('includes Authorization header only when apiKey is provided', async () => {
      const clientWithoutKey = new LMStudioClient({
        host: baseUrl,
      }, mockLogger);

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
            },
          },
        ],
      };

      nock(baseUrl)
        .post('/v1/chat/completions')
        .matchHeader('Content-Type', 'application/json')
        .reply(HTTP_OK, mockResponse);

      await clientWithoutKey.chat('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      // Should not have Authorization header
      const scope = nock(baseUrl)
        .post('/v1/chat/completions')
        .reply(HTTP_OK, mockResponse);

      expect(scope).toBeDefined();
    });
  });

  describe('chatStream', () => {
    it('handles HTTP errors during streaming', async () => {
      nock(baseUrl)
        .post('/v1/chat/completions')
        .reply(HTTP_INTERNAL_SERVER_ERROR, { error: 'Internal server error' });

      await expect(async () => {
        const chunks: LMStudioStreamChunk[] = [];
        for await (const chunk of client.chatStream('test-model', [
          { role: 'user', content: 'Hello' },
        ])) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('HTTP 500');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles network errors during streaming', async () => {
      nock(baseUrl)
        .post('/v1/chat/completions')
        .replyWithError('Network error');

      await expect(async () => {
        const chunks: LMStudioStreamChunk[] = [];
        for await (const chunk of client.chatStream('test-model', [
          { role: 'user', content: 'Hello' },
        ])) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Network error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
