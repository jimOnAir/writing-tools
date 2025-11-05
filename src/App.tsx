import logo from './logo.svg';
import './App.css';
import Settings from './Settings';
import ChatComponent from './components/ChatComponent';

// Check for query parameter to determine if we should show settings
const getUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    view: urlParams.get('view')
  };
};

const { view } = getUrlParams();

function App() {
  if (view === 'settings') {
    return <Settings />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white p-4">
      <header className="flex flex-col items-center justify-center p-4 mb-4">
        <h1 className="text-2xl font-bold">Ollama Chat Interface</h1>
        <p className="mt-2 text-gray-400">
          Interact with local AI models through Ollama
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center w-full">
        <ChatComponent />
      </main>

      <footer className="mt-4 text-center text-gray-500 text-sm">
        <p>Ollama Chat Interface - Connect to your local AI models</p>
      </footer>
    </div>
  );
}

export default App;
