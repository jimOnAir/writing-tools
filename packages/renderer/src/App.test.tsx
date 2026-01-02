import { render, screen } from '@testing-library/react';
import React from 'react';

import App from './App';

// Mock electronAPI for testing
const mockElectronAPI = {
  invoke: jest.fn(),
  onChatWindowData: jest.fn(() => jest.fn()),
  offChatWindowData: jest.fn(),
  onOllamaResponse: jest.fn(() => jest.fn()),
  offOllamaResponse: jest.fn(),
  onPromptSelectorData: jest.fn(() => jest.fn()),
  offPromptSelectorData: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

test('renders chat interface by default', () => {
  render(<App />);
  const chatPlaceholder = screen.getByPlaceholderText('Type your message here...');
  expect(chatPlaceholder).toBeInTheDocument();
});
