import type { IChatWindowData, IChatMessage, TChatResponse, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, logger } from '@writing-tools/shared';
import React, { useState, useEffect, useRef } from 'react';

import { ButtonStyles, MessageStyles, InputStyles, ErrorStyles, LoadingStyles } from '../styles/Styles';
import type { TIpcRenderListener } from '../types/TIpcRenderListener';

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Create handler functions
    const handleChatWindowData = (data: IChatWindowData) => {
      if (data.prompt) {
        logger.info('Clearing previous conversation and starting new one with prompt: %s', data.prompt);
        const initialMessages: IChatMessage[] = [
          {
            id: Date.now().toString(),
            role: 'user',
            content: data.prompt,
            timestamp: new Date(),
          },
        ];

        setMessages(initialMessages);
        setIsLoading(true);
      }
    };

    const handleOllamaResponse = (response: TChatResponse) => {
      logger.info('Current messages count: %s', messages.length.toString());

      // Handle error response
      if ('error' in response) {
        // Display error as a chat message instead of separate error notification
        const errorMessage: IChatMessage = {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: `Error: ${response.error}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);

        return;
      }

      // Handle successful response
      if ('result' in response) {
        const assistantMessage: IChatMessage = {
          id: Date.now().toString() + '-response',
          role: 'assistant',
          content: response.result,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }
    };

    let chatWindowDataListener: TIpcRenderListener;
    let ollamaResponseListener: TIpcRenderListener;
    // Set up IPC listeners
    if (typeof window.electronAPI !== 'undefined') {
      chatWindowDataListener = window.electronAPI.onChatWindowData(handleChatWindowData);
      ollamaResponseListener = window.electronAPI.onOllamaResponse(handleOllamaResponse);
    }

    // Cleanup function if electronAPI is not available
    return () => {
      if (typeof window.electronAPI !== 'undefined') {
        window.electronAPI.offChatWindowData(chatWindowDataListener);
        window.electronAPI.offOllamaResponse(ollamaResponseListener);
      }
    };
  }, [messages.length]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SEND_MESSAGE> = {
      channel: EIpcChannel.CHAT,
      event: EIpcEvent.CHAT_SEND_MESSAGE,
      payload: { messages },
    };

    window.electronAPI.invoke(EIpcChannel.CHAT, payload)
      .then((response) => {
        if ('error' in response) {
          throw new Error(response.error);
        }

        const assistantMessage: IChatMessage = {
          id: Date.now().toString() + '-response',
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      })
      .catch((err: unknown) => {
        const errorText = err instanceof Error
          ? err.message
          : String(err);

        logger.error('Failed to send message to Ollama: %s', errorText);
        setError(`Failed to send message: ${errorText}`);

        // Add error message to chat
        const errorMessage: IChatMessage = {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: `Error: ${errorText}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      if (inputRef.current) {
        inputRef.current.focus();
      }
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
                  <div className="whitespace-pre-wrap">{message.content}</div>
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
          onClick={handleSendMessage}
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
