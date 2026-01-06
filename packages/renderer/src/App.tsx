import './App.css';
import { Logger } from '@writing-tools/shared';
import { useMemo } from 'react';

import { MainLayout } from './components/MainLayout';
import { ChatListService } from './domains/chat-list';
import { MultiChatService } from './domains/multi-chat';
import { PromptSelectorService } from './domains/prompt-selector';
import { SettingsService } from './domains/settings';
import { ElectronIpcAdapter } from './infrastructure/ipc';

function App() {
  // Create logger instance
  const logger = useMemo(() => new Logger(), []);

  // Create service instances
  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);
  const multiChatService = useMemo(() => new MultiChatService(ipcAdapter), [ipcAdapter]);
  const chatListService = useMemo(() => new ChatListService(ipcAdapter), [ipcAdapter]);
  const settingsService = useMemo(() => new SettingsService(ipcAdapter), [ipcAdapter]);
  const promptSelectorService = useMemo(() => new PromptSelectorService(ipcAdapter, logger), [ipcAdapter, logger]);

  // Expose multiChatService to window for before-quit handler
  useMemo(() => {
    window.__multiChatService = multiChatService;
  }, [multiChatService]);

  // Always show MainLayout (single window architecture)
  return (
    <MainLayout
      multiChatService={multiChatService}
      chatListService={chatListService}
      settingsService={settingsService}
      promptSelectorService={promptSelectorService}
    />
  );
}

export default App;
