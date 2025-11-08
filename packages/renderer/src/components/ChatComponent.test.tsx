import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import ChatComponent from './ChatComponent';

// Mock the electronAPI for testing
const mockElectronAPI = {
  invoke: jest.fn(),
  on: jest.fn(),
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('ChatComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders chat interface with empty message list', () => {
    render(<ChatComponent />);

    expect(screen.getByText('No messages yet. Start a conversation with Ollama!')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  test('allows sending a message', async () => {
    // Mock successful response from Ollama
    mockElectronAPI.invoke.mockResolvedValue({
      response: 'This is a simulated response from Ollama',
    });

    render(<ChatComponent />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByText('Send');

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Hello Ollama!' } });
    fireEvent.click(sendButton);

    // Wait for the message to appear
    await waitFor(() => {
      expect(screen.getByText('Hello Ollama!')).toBeInTheDocument();
    });

    // Wait for the response to appear
    await waitFor(() => {
      expect(screen.getByText('This is a simulated response from Ollama')).toBeInTheDocument();
    });
  });

  test('shows error when Ollama is unavailable', async () => {
    // Mock error response from Ollama
    mockElectronAPI.invoke.mockResolvedValue({
      error: 'Connection refused',
    });

    render(<ChatComponent />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByText('Send');

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Error: Connection refused')).toBeInTheDocument();
    });
  });
});
