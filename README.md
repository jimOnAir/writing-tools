# Writing Tools Desktop Application

A desktop application that provides an interface for interacting with local AI models through Ollama.

## Features

- **Ollama Chat Interface**: Chat with local AI models directly in the application
- **Global Shortcut Processing**: Process clipboard text with a global keyboard shortcut
- **Settings Management**: Configure Ollama server address, model selection, and global shortcut
- **Conversation History**: Maintain chat history during conversations
- **Error Handling**: Graceful handling of Ollama server unavailability

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Ollama installed and running locally
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

1. Start the development server:
```bash
npm run electron-dev
```

2. Or build the application:
```bash
npm run electron:build
```

## Ollama Integration

The application integrates with Ollama through IPC (Inter-Process Communication) handlers:

1. **Settings Configuration**: Configure Ollama server address and model in the settings panel
2. **Message Sending**: Send messages to Ollama using the chat interface
3. **Response Handling**: Receive and display responses from Ollama
4. **Error Handling**: Handle connection issues or server unavailability

## Global Shortcut Feature

The application supports a global shortcut to process clipboard text with Ollama:

1. **Configuration**: Set up a custom global shortcut in the settings
2. **Usage**: Copy text to your clipboard and press the configured shortcut
3. **Processing**: The application will send the clipboard text to Ollama with a custom prompt
4. **Response**: A new chat window will open displaying the original text and Ollama's response

## Project Structure

```
src/
├── App.tsx                 # Main application component
├── components/             # React components
│   └── ChatComponent.tsx   # Chat interface component
├── ipcHandlers.ts          # IPC communication handlers
├── Settings.tsx            # Settings management component
└── interfaces/             # TypeScript interfaces
    └── ISettings.ts        # Settings interface
```

## Development

### Adding New Features

To add new features, follow these steps:

1. Create new components in the `src/components/` directory
2. Add IPC handlers in `src/ipcHandlers.ts` if needed
3. Update the main application component (`src/App.tsx`) to integrate new features
4. Add appropriate tests and documentation

### Testing

Run tests with:
```bash
npm test
```

### Building

Build the application with:
```bash
npm run electron:build
```

## Troubleshooting

### Ollama Not Found

If you get errors related to Ollama not being found:

1. Ensure Ollama is installed and running
2. Verify the Ollama server address in settings (default: http://localhost:11434)
3. Check that the Ollama service is accessible

### Connection Issues

If you experience connection issues:

1. Verify that Ollama is running on the configured address
2. Check network connectivity
3. Ensure firewall settings allow connections to the Ollama port

## License

This project is licensed under the MIT License.
