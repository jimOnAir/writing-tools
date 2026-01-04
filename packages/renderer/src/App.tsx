import './App.css';
import { useMemo } from 'react';

import { Logger } from '@writing-tools/shared';

import { MainLayout } from './components/MainLayout';
import PromptSelectorComponent from './components/PromptSelectorComponent';
import { ChatListService } from './domains/chat-list';
import { MultiChatService } from './domains/multi-chat';
import { PromptSelectorService } from './domains/prompt-selector';
import { SettingsService } from './domains/settings';
import { ElectronIpcAdapter } from './infrastructure/ipc';

/**
 * Get URL parameters to determine which view to show
 * For backward compatibility, we still support prompt-selector view
 */
const getUrlParams = () => {
  const urlParams = new URLSearchParams(globalThis.location.search);

  return {
    view: urlParams.get('view'),
  };
};

const { view } = getUrlParams();

function App() {
  // Create logger instance
  const logger = useMemo(() => new Logger(), []);

  // Create service instances
  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);
  const multiChatService = useMemo(() => new MultiChatService(ipcAdapter), [ipcAdapter]);
  const chatListService = useMemo(() => new ChatListService(ipcAdapter), [ipcAdapter]);
  const settingsService = useMemo(() => new SettingsService(ipcAdapter), [ipcAdapter]);
  const promptSelectorService = useMemo(() => new PromptSelectorService(ipcAdapter, logger), [ipcAdapter, logger]);

  // Handle prompt-selector view (backward compatibility)
  if (view === 'prompt-selector') {
    return <PromptSelectorComponent promptSelectorService={promptSelectorService} />;
  }

  // Main layout with tabs, sidebar, and settings
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
