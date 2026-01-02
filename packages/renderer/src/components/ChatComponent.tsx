import type { IChatMessage } from '@writing-tools/shared';
import React, { useState, useEffect, useRef, useMemo } from 'react';

import { ChatService } from '../domains/chat';
import { ElectronIpcAdapter } from '../infrastructure/ipc';
import { ButtonStyles, MessageStyles, InputStyles, ErrorStyles, LoadingStyles } from '../styles/Styles';
import { renderMarkdown } from '../utils/markdownRenderer';

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHandlingResponse, setIsHandlingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Create service instance
  const chatService = useMemo(() => {
    const ipcAdapter = new ElectronIpcAdapter();
    const service = new ChatService(ipcAdapter);

    // Register callbacks
    service.setCallbacks({
      onMessagesChange: setMessages,
      onLoadingChange: setIsLoading,
      onErrorChange: setError,
      onHandlingResponseChange: setIsHandlingResponse,
    });

    return service;
  }, []);

  // Initialize listeners on mount
  useEffect(() => {
    chatService.initializeListeners();

    return () => {
      chatService.cleanupListeners();
    };
  }, [chatService]);

  // Scroll to bottom when messages change (unless handling response)
  useEffect(() => {
    if (!isHandlingResponse) {
      scrollToBottom();
    }
  }, [messages, isHandlingResponse]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    const errorText = await chatService.sendMessage(inputValue);
    if (!errorText) {
      setInputValue('');
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const historyValue = chatService.navigateHistoryUp();
      if (historyValue !== null) {
        setInputValue(historyValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const historyValue = chatService.navigateHistoryDown();
      if (historyValue !== null) {
        setInputValue(historyValue);
      }
    } else {
      // Other keys are ignored
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-800 rounded-lg mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>No messages yet. Start a conversation with Ollama!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${MessageStyles[message.role]}`}
                >
                  <div
                    className="whitespace-pre-wrap markdown-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                  />
                  <div className="text-xs mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-white p-3 rounded-lg rounded-bl-none">
                  <div className={LoadingStyles}>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className={ErrorStyles}>
          {error}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <textarea
          value={inputValue}
          ref={inputRef}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyPress}
          placeholder="Type your message here..."
          className={InputStyles}
          rows={5}
          disabled={isLoading}
        />
        <button
          onClick={() => {
            void handleSendMessage();
          }}
          disabled={isLoading || !inputValue.trim()}
          className={`${ButtonStyles.base} ${
            isLoading || !inputValue.trim()
              ? ButtonStyles.disabled
              : ButtonStyles.primary
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
