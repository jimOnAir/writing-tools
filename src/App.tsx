import logo from './logo.svg';
import './App.css';
import Settings from './Settings';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <header className="flex flex-col items-center justify-center p-8">
        <img src={logo} className="h-48 w-48 animate-spin" alt="logo" />
        <p className="mt-4 text-lg">
          Edit <code className="bg-gray-800 px-2 py-1 rounded">src/App.tsx</code> and save to reload.
        </p>
        <a
          className="mt-4 text-cyan-400 hover:text-cyan-300 underline"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
