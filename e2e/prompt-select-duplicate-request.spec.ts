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
      const chatWindowDataCallbacks: Array<(data: any) => void> = [];
      let chatSendMessageCallCount = 0;
      let promptSelectCallCount = 0;

      (globalThis as any).electronAPI = {
        invoke: async (channel: string, data: any) => {
          // Track CHAT_SEND_MESSAGE calls (renderer-side)
          if (channel === 'CHAT' && data?.event === 'CHAT_SEND_MESSAGE') {
            chatSendMessageCallCount++;
            (globalThis as any).__chatSendMessageCallCount = chatSendMessageCallCount;
          }
          // Track PROMPT_SELECT calls
          if (channel === 'PROMPT_SELECTOR' && data?.event === 'PROMPT_SELECT') {
            promptSelectCallCount++;
            (globalThis as any).__promptSelectCallCount = promptSelectCallCount;
            // Simulate the main process behavior: after PROMPT_SELECT, it sends CHAT_WINDOW_DATA
            // This simulates what handlePromptSelect does in IpcHandlers
            setTimeout(() => {
              // Trigger all registered CHAT_WINDOW_DATA callbacks
              for (const callback of chatWindowDataCallbacks) {
                callback({
                  prompt: data.payload.prompt,
                  chatId: testChatId,
                });
              }
            }, 10);
          }
          // Return mock response for other calls
          if (channel === 'CHAT' && data?.event === 'CHAT_CREATE_SESSION') {
            return { chatId: testChatId };
          }
          if (channel === 'CHAT' && data?.event === 'CHAT_LOAD_MESSAGES') {
            return { messages: [{ id: '1', role: 'user', content: 'Test prompt', timestamp: new Date().toISOString() }] };
          }
          if (channel === 'SETTINGS' && data?.event === 'SETTINGS_LOAD') {
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
        onChatWindowData: (callback: (data: any) => void) => {
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
        offChatWindowData: () => {},
        onOllamaResponse: () => ({ remove: () => {} }),
        offOllamaResponse: () => {},
        onPromptSelectorData: () => ({ remove: () => {} }),
        offPromptSelectorData: () => {},
        onChatTitleUpdated: () => ({ remove: () => {} }),
        offChatTitleUpdated: () => {},
        onChatLoadMessagesData: () => ({ remove: () => {} }),
        offChatLoadMessagesData: () => {},
        onChatDeleted: () => ({ remove: () => {} }),
        offChatDeleted: () => {},
      };

      // Initialize counters
      (globalThis as any).__chatSendMessageCallCount = 0;
      (globalThis as any).__promptSelectCallCount = 0;
    }, TEST_CHAT_ID);

    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for app to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Wait a bit for the app to initialize
    await page.waitForTimeout(INIT_WAIT_MS);

    // Get initial call count
    const initialChatSendCount = await page.evaluate(() => (globalThis as any).__chatSendMessageCallCount || 0);

    // Trigger the prompt select IPC call (simulating clicking a preconfigured prompt)
    await page.evaluate(async () => {
      if ((globalThis as any).electronAPI) {
        await (globalThis as any).electronAPI.invoke('PROMPT_SELECTOR', {
          event: 'PROMPT_SELECT',
          payload: { prompt: 'Test prompt with selected text' },
        });
      }
    });

    // Wait for events to propagate (CHAT_WINDOW_DATA should be triggered)
    await page.waitForTimeout(WAIT_TIMEOUT_MS);

    // Check that PROMPT_SELECT was called
    const promptSelectCount = await page.evaluate(() => (globalThis as any).__promptSelectCallCount || 0);
    expect(promptSelectCount).toBeGreaterThan(0);

    // Check that CHAT_SEND_MESSAGE was NOT called from the renderer
    // The fix ensures that MultiChatService.handleChatWindowData does NOT call sendMessage
    // when receiving CHAT_WINDOW_DATA from prompt select
    const finalChatSendCount = await page.evaluate(() => (globalThis as any).__chatSendMessageCallCount || 0);

    // The count should remain the same - MultiChatService should NOT call sendMessage
    expect(finalChatSendCount).toBe(initialChatSendCount);
  });

  test('should load messages when receiving CHAT_WINDOW_DATA from prompt select', async ({ page }) => {
    const WAIT_TIMEOUT_MS = 500;
    const TEST_CHAT_ID = 123;
    const INIT_WAIT_MS = 1000;

    await page.addInitScript((testChatId: number) => {
      const chatWindowDataCallbacks: Array<(data: any) => void> = [];

      (globalThis as any).electronAPI = {
        invoke: async (channel: string, data: any) => {
          // Track CHAT_LOAD_MESSAGES calls (this is what should be called instead of sendMessage)
          if (channel === 'CHAT' && data?.event === 'CHAT_LOAD_MESSAGES') {
            (globalThis as any).__chatLoadMessagesCalled = true;
            (globalThis as any).__chatIdReceived = data.payload.chatId;
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
          if (channel === 'CHAT' && data?.event === 'CHAT_CREATE_SESSION') {
            return { chatId: testChatId };
          }
          if (channel === 'SETTINGS' && data?.event === 'SETTINGS_LOAD') {
            return {
              provider: 'ollama',
              ollama: { address: 'http://localhost:11434', model: 'test-model', apiKey: '' },
              lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
              preconfiguredPrompts: [],
            };
          }
          return { success: true };
        },
        onChatWindowData: (callback: (data: any) => void) => {
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
        offChatWindowData: () => {},
        onOllamaResponse: () => ({ remove: () => {} }),
        offOllamaResponse: () => {},
        onPromptSelectorData: () => ({ remove: () => {} }),
        offPromptSelectorData: () => {},
        onChatTitleUpdated: () => ({ remove: () => {} }),
        offChatTitleUpdated: () => {},
        onChatLoadMessagesData: () => ({ remove: () => {} }),
        offChatLoadMessagesData: () => {},
        onChatDeleted: () => ({ remove: () => {} }),
        offChatDeleted: () => {},
      };
      (globalThis as any).__chatLoadMessagesCalled = false;
      (globalThis as any).__chatIdReceived = null;
      (globalThis as any).__triggerChatWindowData = (data: any) => {
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
      if ((globalThis as any).__triggerChatWindowData) {
        (globalThis as any).__triggerChatWindowData({
          prompt: 'Test prompt',
          chatId: testChatId,
        });
      }
    }, TEST_CHAT_ID);

    await page.waitForTimeout(WAIT_TIMEOUT_MS);

    // Verify that loadChatMessages was called (not sendMessage)
    // This is the correct behavior after the fix
    const loadMessagesCalled = await page.evaluate(() => (globalThis as any).__chatLoadMessagesCalled || false);
    const chatId = await page.evaluate(() => (globalThis as any).__chatIdReceived || null);

    expect(loadMessagesCalled).toBe(true);
    expect(chatId).toBe(TEST_CHAT_ID);
  });
});
