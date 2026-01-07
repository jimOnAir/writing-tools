import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';
import type { IPreconfiguredPrompt, IPromptSelectorData, ILogger } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';

import { PromptSelectorService } from './PromptSelectorService';

describe('PromptSelectorService', () => {
  let mockIpcAdapter: jest.Mocked<IIpcAdapter>;
  let mockLogger: jest.Mocked<ILogger>;
  let promptSelectorService: PromptSelectorService;
  let mockListener: TIpcRenderListener;

  beforeEach(() => {
    jest.clearAllMocks();

    mockListener = { remove: jest.fn() } as unknown as TIpcRenderListener;

    mockIpcAdapter = {
      invoke: jest.fn(),
      onChatWindowData: jest.fn(),
      offChatWindowData: jest.fn(),
      onOllamaResponse: jest.fn(),
      offOllamaResponse: jest.fn(),
      onPromptSelectorData: jest.fn(() => mockListener),
      offPromptSelectorData: jest.fn(),
      onChatTitleUpdated: jest.fn(),
      offChatTitleUpdated: jest.fn(),
      onChatLoadMessagesData: jest.fn(),
      offChatLoadMessagesData: jest.fn(),
      onChatDeleted: jest.fn(),
      offChatDeleted: jest.fn(),
    } as unknown as jest.Mocked<IIpcAdapter>;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    promptSelectorService = new PromptSelectorService(mockIpcAdapter, mockLogger);
  });

  describe('setCallbacks', () => {
    it('registers callbacks', () => {
      const onSelectedTextChange = jest.fn();
      const onPromptsChange = jest.fn();

      promptSelectorService.setCallbacks({
        onSelectedTextChange,
        onPromptsChange,
      });

      expect(promptSelectorService).toBeDefined();
    });
  });

  describe('initializeListeners', () => {
    it('registers prompt selector data listener', () => {
      promptSelectorService.initializeListeners();

      expect(mockIpcAdapter.onPromptSelectorData).toHaveBeenCalled();
    });

    it('handles errors when initializing listeners', () => {
      const error = new Error('Failed to register listener');
      mockIpcAdapter.onPromptSelectorData.mockImplementation(() => {
        throw error;
      });

      promptSelectorService.initializeListeners();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize prompt selector listeners: %s', 'Failed to register listener');
    });
  });

  describe('cleanupListeners', () => {
    it('unregisters listener', () => {
      promptSelectorService.initializeListeners();
      promptSelectorService.cleanupListeners();

      expect(mockIpcAdapter.offPromptSelectorData).toHaveBeenCalled();
    });
  });

  describe('selectPrompt', () => {
    it('selects prompt and processes template', async () => {
      // Set selected text first
      promptSelectorService.setPromptSelectorData({
        selectedText: 'Hello world',
        preconfiguredPrompts: [],
      });

      mockIpcAdapter.invoke.mockResolvedValue({} as Record<string, never>);

      await promptSelectorService.selectPrompt({
        prompt: 'Summarize: {text}',
        title: 'Summarize',
      });

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.PROMPT_SELECTOR,
        expect.objectContaining({
          event: EIpcEvent.PROMPT_SELECT,
          payload: {
            model: undefined,
            prompt: 'Summarize: Hello world',
            provider: undefined,
          },
        }),
      );
    });

    it('adds {text} placeholder if not present', async () => {
      promptSelectorService.setPromptSelectorData({
        selectedText: 'Test text',
        preconfiguredPrompts: [],
      });

      mockIpcAdapter.invoke.mockResolvedValue({} as Record<string, never>);

      await promptSelectorService.selectPrompt({
        prompt: 'Just a prompt',
        title: 'Just a prompt',
      });

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.PROMPT_SELECTOR,
        expect.objectContaining({
          payload: {
            prompt: 'Just a prompt\nTest text',
          },
        }),
      );
    });

    it('handles errors when selecting prompt', async () => {
      promptSelectorService.setPromptSelectorData({
        selectedText: 'Test',
        preconfiguredPrompts: [],
      });

      mockIpcAdapter.invoke.mockRejectedValue(new Error('Select failed'));

      await expect(promptSelectorService.selectPrompt({
        prompt: 'Prompt',
        title: 'Prompt',
      })).rejects.toThrow('Select failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error selecting prompt: %s', 'Select failed');
    });
  });

  describe('submitCustomPrompt', () => {
    it('submits custom prompt', async () => {
      promptSelectorService.setPromptSelectorData({
        selectedText: 'Custom text',
        preconfiguredPrompts: [],
      });

      mockIpcAdapter.invoke.mockResolvedValue({} as Record<string, never>);

      await promptSelectorService.submitCustomPrompt('Custom: {text}');

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.PROMPT_SELECTOR,
        expect.objectContaining({
          payload: {
            prompt: 'Custom: Custom text',
          },
        }),
      );
    });

    it('does not submit empty prompt', async () => {
      await promptSelectorService.submitCustomPrompt('   ');

      expect(mockIpcAdapter.invoke).not.toHaveBeenCalled();
    });

    it('handles errors when submitting custom prompt', async () => {
      promptSelectorService.setPromptSelectorData({
        selectedText: 'Test',
        preconfiguredPrompts: [],
      });

      mockIpcAdapter.invoke.mockRejectedValue(new Error('Submit failed'));

      await expect(promptSelectorService.submitCustomPrompt('Custom')).rejects.toThrow('Submit failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error selecting prompt: %s', 'Submit failed');
    });
  });

  describe('getSelectedText', () => {
    it('returns selected text', () => {
      promptSelectorService.setPromptSelectorData({
        selectedText: 'Test text',
        preconfiguredPrompts: [],
      });

      expect(promptSelectorService.getSelectedText()).toBe('Test text');
    });
  });

  describe('getPreconfiguredPrompts', () => {
    it('returns preconfigured prompts', () => {
      const prompts: IPreconfiguredPrompt[] = [
        { title: 'Prompt 1', prompt: 'Test {text}', icon: undefined },
      ];

      promptSelectorService.setPromptSelectorData({
        selectedText: '',
        preconfiguredPrompts: prompts,
      });

      expect(promptSelectorService.getPreconfiguredPrompts()).toEqual(prompts);
    });
  });

  describe('setPromptSelectorData', () => {
    it('updates selected text and prompts', () => {
      const onSelectedTextChange = jest.fn();
      const onPromptsChange = jest.fn();

      promptSelectorService.setCallbacks({
        onSelectedTextChange,
        onPromptsChange,
      });

      const data: IPromptSelectorData = {
        selectedText: 'New text',
        preconfiguredPrompts: [
          { title: 'New Prompt', prompt: 'New {text}', icon: undefined },
        ],
      };

      promptSelectorService.setPromptSelectorData(data);

      expect(onSelectedTextChange).toHaveBeenCalledWith('New text');
      expect(onPromptsChange).toHaveBeenCalledWith(data.preconfiguredPrompts);
    });
  });

  describe('listener handler', () => {
    it('handles prompt selector data event', () => {
      promptSelectorService.initializeListeners();

      const onSelectedTextChange = jest.fn();
      const onPromptsChange = jest.fn();

      promptSelectorService.setCallbacks({
        onSelectedTextChange,
        onPromptsChange,
      });

      const dataCallback = (mockIpcAdapter.onPromptSelectorData as jest.Mock).mock.calls[0][0];

      const data: IPromptSelectorData = {
        selectedText: 'Event text',
        preconfiguredPrompts: [
          { title: 'Event Prompt', prompt: 'Event {text}', icon: undefined },
        ],
      };

      dataCallback(data);

      expect(mockLogger.info).toHaveBeenCalledWith('Received prompt selector data');
      expect(onSelectedTextChange).toHaveBeenCalledWith('Event text');
      expect(onPromptsChange).toHaveBeenCalledWith(data.preconfiguredPrompts);
    });
  });
});
