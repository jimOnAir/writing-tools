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
      <main className="h-full w-full">
        <ChatComponent />
      </main>
    </div>
  );
}

export default App;
