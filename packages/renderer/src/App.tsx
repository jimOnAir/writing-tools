import './App.css';
import { Logger } from '@writing-tools/shared';
import { useMemo } from 'react';

import { MainLayout } from './components/MainLayout';
import { ChatListService } from './domains/chat-list';
import { MultiChatService } from './domains/multi-chat';
import { SettingsService } from './domains/settings';
import { ElectronIpcAdapter } from './infrastructure/ipc';

// TODO: Rewrite interface with Shadcn
function App() {
  const logger = useMemo(() => new Logger(), []);

  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);
  const multiChatService = useMemo(() => new MultiChatService(ipcAdapter, logger), [ipcAdapter, logger]);
  const chatListService = useMemo(() => new ChatListService(ipcAdapter), [ipcAdapter]);
  const settingsService = useMemo(() => new SettingsService(ipcAdapter), [ipcAdapter]);

  useMemo(() => {
    window.__multiChatService = multiChatService;
  }, [multiChatService]);

  return (
    <MainLayout
      chatListService={chatListService}
      multiChatService={multiChatService}
      settingsService={settingsService}
    />
  );
}

export default App;
