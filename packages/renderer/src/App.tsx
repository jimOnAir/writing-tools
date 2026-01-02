import './App.css';
import { useMemo } from 'react';

import ChatComponent from './components/ChatComponent';
import ChatListComponent from './components/ChatListComponent';
import PromptSelectorComponent from './components/PromptSelectorComponent';
import Settings from './components/Settings';
import { ChatListService } from './domains/chat-list';
import { ChatService } from './domains/chat';
import { PromptSelectorService } from './domains/prompt-selector';
import { SettingsService } from './domains/settings';
import { ElectronIpcAdapter } from './infrastructure/ipc';
import { BackgroundStyles } from './styles/Styles';

/**
 * Get URL parameters to determine which view to show
 */
const getUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);

  return {
    view: urlParams.get('view'),
  };
};

const { view } = getUrlParams();

function App() {
  // Create service instances
  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);
  const chatService = useMemo(() => new ChatService(ipcAdapter), [ipcAdapter]);
  const chatListService = useMemo(() => new ChatListService(ipcAdapter), [ipcAdapter]);
  const settingsService = useMemo(() => new SettingsService(ipcAdapter), [ipcAdapter]);
  const promptSelectorService = useMemo(() => new PromptSelectorService(ipcAdapter), [ipcAdapter]);

  if (view === 'settings') {
    return <Settings settingsService={settingsService} />;
  }

  if (view === 'prompt-selector') {
    return <PromptSelectorComponent promptSelectorService={promptSelectorService} />;
  }

  if (view === 'chat-list') {
    return <ChatListComponent chatListService={chatListService} />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${BackgroundStyles.main} text-white p-3 h-full`}>
      <main className="h-full w-full flex flex-col flex-1">
        <ChatComponent chatService={chatService} />
      </main>
    </div>
  );
}

export default App;
