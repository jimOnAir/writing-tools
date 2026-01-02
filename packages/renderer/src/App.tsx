import './App.css';
import ChatComponent from './components/ChatComponent';
import PromptSelectorComponent from './components/PromptSelectorComponent';
import Settings from './components/Settings';

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
  if (view === 'settings') {
    return <Settings />;
  }

  if (view === 'prompt-selector') {
    return <PromptSelectorComponent />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white p-4 h-full">
      <main className="h-full w-full flex flex-col flex-1">
        <ChatComponent />
      </main>
    </div>
  );
}

export default App;
