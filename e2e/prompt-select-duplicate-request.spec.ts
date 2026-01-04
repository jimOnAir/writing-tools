import { test, expect } from '@playwright/test';

/**
 * E2E test for duplicate LLM request bug fix
 *
 * Bug: When switching from preconfigured prompts to chat tab,
 * the LLM request was being sent twice - once by the main process
 * (handlePromptSelect) and once by the renderer (MultiChatService.handleChatWindowData).
 *
 * Fix: MultiChatService no longer calls sendMessage when receiving CHAT_WINDOW_DATA
 * from prompt select. Instead, it loads messages and lets the OLLAMA_RESPONSE
 * listener handle the response.
 *
 * This test verifies that only one LLM request is sent when selecting a preconfigured prompt.
 */

test.describe('Prompt Select - Duplicate Request Prevention', () => {
  test('should not send duplicate LLM request when switching from preconfigured prompt to chat', async ({ page }) => {
    const WAIT_TIMEOUT_MS = 500;
    const INIT_WAIT_MS = 1000;
    const TEST_CHAT_ID = 123;

    // Mock window.electronAPI to track IPC calls
    await page.addInitScript((testChatId: number) => {
      // Inline mock API creation (can't use helper functions in browser context)
      const chatWindowDataCallbacks: Array<(data: { prompt: string, chatId: number }) => void> = [];
      let chatSendMessageCallCount = 0;
      let promptSelectCallCount = 0;

      const globalState = globalThis as unknown as {
        electronAPI?: {
          invoke: (channel: string, data: { event?: string, payload?: { prompt?: string, chatId?: number } }) => Promise<unknown>,
          onChatWindowData: (callback: (data: { prompt: string, chatId: number }) => void) => { remove: () => void },
          offChatWindowData: () => void,
          onOllamaResponse: () => { remove: () => void },
          offOllamaResponse: () => void,
          onPromptSelectorData: () => { remove: () => void },
          offPromptSelectorData: () => void,
          onChatTitleUpdated: () => { remove: () => void },
          offChatTitleUpdated: () => void,
          onChatLoadMessagesData: () => { remove: () => void },
          offChatLoadMessagesData: () => void,
          onChatDeleted: () => { remove: () => void },
          offChatDeleted: () => void,
        },
        __chatSendMessageCallCount?: number,
        __promptSelectCallCount?: number,
      };

      globalState.electronAPI = {
        // eslint-disable-next-line @typescript-eslint/require-await
        invoke: async (channel: string, data: { event?: string, payload?: { prompt?: string, chatId?: number } }) => {
          // Track CHAT_SEND_MESSAGE calls (renderer-side)
          if (channel === 'CHAT' && data.event === 'CHAT_SEND_MESSAGE') {
            chatSendMessageCallCount++;
            globalState.__chatSendMessageCallCount = chatSendMessageCallCount;
          }
          // Track PROMPT_SELECT calls
          if (channel === 'PROMPT_SELECTOR' && data.event === 'PROMPT_SELECT') {
            promptSelectCallCount++;
            globalState.__promptSelectCallCount = promptSelectCallCount;
            // Simulate the main process behavior: after PROMPT_SELECT, it sends CHAT_WINDOW_DATA
            // This simulates what handlePromptSelect does in IpcHandlers
            setTimeout(() => {
              // Trigger all registered CHAT_WINDOW_DATA callbacks
              for (const callback of chatWindowDataCallbacks) {
                callback({
                  prompt: data.payload?.prompt ?? '',
                  chatId: testChatId,
                });
              }
            }, 10);
          }
          // Return mock response for other calls
          if (channel === 'CHAT' && data.event === 'CHAT_CREATE_SESSION') {
            return { chatId: testChatId };
          }
          if (channel === 'CHAT' && data.event === 'CHAT_LOAD_MESSAGES') {
            return { messages: [{ id: '1', role: 'user', content: 'Test prompt', timestamp: new Date().toISOString() }] };
          }
          if (channel === 'SETTINGS' && data.event === 'SETTINGS_LOAD') {
            return {
              provider: 'ollama',
              ollama: { address: 'http://localhost:11434', model: 'test-model', apiKey: '' },
              lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
              preconfiguredPrompts: [
                { id: '1', name: 'Test Prompt', template: 'Test {text}', icon: null },
              ],
            };
          }

          return { success: true };
        },
        onChatWindowData: (callback: (data: { prompt: string, chatId: number }) => void) => {
          chatWindowDataCallbacks.push(callback);

          return {
            remove: () => {
              const index = chatWindowDataCallbacks.indexOf(callback);
              if (index > -1) {
                chatWindowDataCallbacks.splice(index, 1);
              }
            },
          };
        },
        offChatWindowData: () => {
          // Mock implementation
        },
        onOllamaResponse: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offOllamaResponse: () => {
          // Mock implementation
        },
        onPromptSelectorData: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offPromptSelectorData: () => {
          // Mock implementation
        },
        onChatTitleUpdated: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offChatTitleUpdated: () => {
          // Mock implementation
        },
        onChatLoadMessagesData: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offChatLoadMessagesData: () => {
          // Mock implementation
        },
        onChatDeleted: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offChatDeleted: () => {
          // Mock implementation
        },
      };

      globalState.__chatSendMessageCallCount = 0;
      globalState.__promptSelectCallCount = 0;
    }, TEST_CHAT_ID);

    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for app to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Wait a bit for the app to initialize
    await page.waitForTimeout(INIT_WAIT_MS);

    // Get initial call count
    const initialChatSendCount = await page.evaluate(() => {
      const globalState = globalThis as unknown as {
        __chatSendMessageCallCount?: number,
      };

      return globalState.__chatSendMessageCallCount ?? 0;
    });

    // Trigger the prompt select IPC call (simulating clicking a preconfigured prompt)
    await page.evaluate(async () => {
      const globalState = globalThis as unknown as {
        electronAPI?: {
          invoke: (channel: string, data: { event?: string, payload?: { prompt?: string, chatId?: number } }) => Promise<unknown>,
        },
      };

      if (globalState.electronAPI) {
        await globalState.electronAPI.invoke('PROMPT_SELECTOR', {
          event: 'PROMPT_SELECT',
          payload: { prompt: 'Test prompt with selected text' },
        });
      }
    });

    // Wait for events to propagate (CHAT_WINDOW_DATA should be triggered)
    await page.waitForTimeout(WAIT_TIMEOUT_MS);

    // Check that PROMPT_SELECT was called
    const promptSelectCount = await page.evaluate(() => {
      const globalState = globalThis as unknown as {
        __promptSelectCallCount?: number,
      };

      return globalState.__promptSelectCallCount ?? 0;
    });

    expect(promptSelectCount).toBeGreaterThan(0);

    // Check that CHAT_SEND_MESSAGE was NOT called from the renderer
    // The fix ensures that MultiChatService.handleChatWindowData does NOT call sendMessage
    // when receiving CHAT_WINDOW_DATA from prompt select
    const finalChatSendCount = await page.evaluate(() => {
      const globalState = globalThis as unknown as {
        __chatSendMessageCallCount?: number,
      };

      return globalState.__chatSendMessageCallCount ?? 0;
    });

    // The count should remain the same - MultiChatService should NOT call sendMessage
    expect(finalChatSendCount).toBe(initialChatSendCount);
  });

  test('should load messages when receiving CHAT_WINDOW_DATA from prompt select', async ({ page }) => {
    const WAIT_TIMEOUT_MS = 500;
    const TEST_CHAT_ID = 123;
    const INIT_WAIT_MS = 1000;

    await page.addInitScript((testChatId: number) => {
      // Inline mock API creation (can't use helper functions in browser context)
      const chatWindowDataCallbacks: Array<(data: { prompt: string, chatId: number }) => void> = [];

      const globalState = globalThis as unknown as {
        electronAPI?: {
          invoke: (channel: string, data: { event?: string, payload?: { prompt?: string, chatId?: number } }) => Promise<unknown>,
          onChatWindowData: (callback: (data: { prompt: string, chatId: number }) => void) => { remove: () => void },
          offChatWindowData: () => void,
          onOllamaResponse: () => { remove: () => void },
          offOllamaResponse: () => void,
          onPromptSelectorData: () => { remove: () => void },
          offPromptSelectorData: () => void,
          onChatTitleUpdated: () => { remove: () => void },
          offChatTitleUpdated: () => void,
          onChatLoadMessagesData: () => { remove: () => void },
          offChatLoadMessagesData: () => void,
          onChatDeleted: () => { remove: () => void },
          offChatDeleted: () => void,
        },
        __chatLoadMessagesCalled?: boolean,
        __chatIdReceived?: number | null,
        __triggerChatWindowData?: (data: { prompt: string, chatId: number }) => void,
      };

      globalState.electronAPI = {
        // eslint-disable-next-line @typescript-eslint/require-await
        invoke: async (channel: string, data: { event?: string, payload?: { prompt?: string, chatId?: number } }) => {
          // Track CHAT_LOAD_MESSAGES calls (this is what should be called instead of sendMessage)
          if (channel === 'CHAT' && data.event === 'CHAT_LOAD_MESSAGES') {
            globalState.__chatLoadMessagesCalled = true;
            globalState.__chatIdReceived = data.payload?.chatId ?? null;

            return {
              messages: [
                {
                  id: '1',
                  role: 'user',
                  content: 'Test prompt',
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          }
          if (channel === 'CHAT' && data.event === 'CHAT_CREATE_SESSION') {
            return { chatId: testChatId };
          }
          if (channel === 'SETTINGS' && data.event === 'SETTINGS_LOAD') {
            return {
              provider: 'ollama',
              ollama: { address: 'http://localhost:11434', model: 'test-model', apiKey: '' },
              lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
              preconfiguredPrompts: [],
            };
          }

          return { success: true };
        },
        onChatWindowData: (callback: (data: { prompt: string, chatId: number }) => void) => {
          chatWindowDataCallbacks.push(callback);

          return {
            remove: () => {
              const index = chatWindowDataCallbacks.indexOf(callback);
              if (index > -1) {
                chatWindowDataCallbacks.splice(index, 1);
              }
            },
          };
        },
        offChatWindowData: () => {
          // Mock implementation
        },
        onOllamaResponse: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offOllamaResponse: () => {
          // Mock implementation
        },
        onPromptSelectorData: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offPromptSelectorData: () => {
          // Mock implementation
        },
        onChatTitleUpdated: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offChatTitleUpdated: () => {
          // Mock implementation
        },
        onChatLoadMessagesData: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offChatLoadMessagesData: () => {
          // Mock implementation
        },
        onChatDeleted: () => ({
          remove: () => {
            // Mock implementation
          },
        }),
        offChatDeleted: () => {
          // Mock implementation
        },
      };

      globalState.__chatLoadMessagesCalled = false;
      globalState.__chatIdReceived = null;
      globalState.__triggerChatWindowData = (data: { prompt: string, chatId: number }) => {
        for (const callback of chatWindowDataCallbacks) {
          callback(data);
        }
      };
    }, TEST_CHAT_ID);

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(INIT_WAIT_MS);

    // Simulate CHAT_WINDOW_DATA event (what main process sends after prompt select)
    await page.evaluate((testChatId: number) => {
      const globalState = globalThis as unknown as {
        __triggerChatWindowData?: (data: { prompt: string, chatId: number }) => void,
      };

      if (globalState.__triggerChatWindowData) {
        globalState.__triggerChatWindowData({
          prompt: 'Test prompt',
          chatId: testChatId,
        });
      }
    }, TEST_CHAT_ID);

    await page.waitForTimeout(WAIT_TIMEOUT_MS);

    // Verify that loadChatMessages was called (not sendMessage)
    // This is the correct behavior after the fix
    const loadMessagesCalled = await page.evaluate(() => {
      const globalState = globalThis as unknown as {
        __chatLoadMessagesCalled?: boolean,
      };

      return globalState.__chatLoadMessagesCalled ?? false;
    });

    const chatId = await page.evaluate(() => {
      const globalState = globalThis as unknown as {
        __chatIdReceived?: number | null,
      };

      return globalState.__chatIdReceived ?? null;
    });

    expect(loadMessagesCalled).toBe(true);
    expect(chatId).toBe(TEST_CHAT_ID);
  });
});
