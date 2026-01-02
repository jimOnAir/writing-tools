import type { IChatMessage } from '@writing-tools/shared';
import React, { useState, useEffect, useRef, useMemo } from 'react';

import { ChatService } from '../domains/chat';
import { ElectronIpcAdapter } from '../infrastructure/ipc';
import { ButtonStyles, MessageStyles, InputStyles, NotificationStyles, LoadingStyles, BackgroundStyles, LayoutStyles, SpinnerIcon, ColorPalette, TypographyStyles } from '../styles/Styles';
import { renderMarkdown } from '../utils/markdownRenderer';

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHandlingResponse, setIsHandlingResponse] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
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
      onTitleChange: setChatTitle,
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

  // Fetch title when currentChatId changes
  useEffect(() => {
    const fetchTitle = async () => {
      const currentChatId = chatService.getCurrentChatId();
      if (currentChatId === null) {
        setChatTitle(null);

        return;
      }

      const chatInfo = await chatService.getChatInfo(currentChatId);
      if (chatInfo === null) {
        setChatTitle(null);

        return;
      }

      setChatTitle(chatInfo.title);
    };

    void fetchTitle();
  }, [chatService, messages]);

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

  // Determine if we should show the title section (if there's a chat or messages)
  const hasActiveChat = chatService.getCurrentChatId() !== null || messages.length > 0;
  const displayTitle = chatTitle !== null && chatTitle.trim() !== '' ? chatTitle : null;

  return (
    <div className={`flex flex-col h-full w-full ${LayoutStyles.container}`}>
      {hasActiveChat && (
        <div className={`mb-4 pb-4 border-b ${ColorPalette.border.defaultLight}`}>
          {displayTitle !== null ? (
            <div
              className={`${TypographyStyles.h2} ${ColorPalette.text.primary} markdown-content`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(displayTitle) }}
            />
          ) : (
            <div className={`${TypographyStyles.h2} ${ColorPalette.text.muted}`}>
              New Chat
            </div>
          )}
        </div>
      )}
      <div className={`flex-1 overflow-y-auto p-4 ${BackgroundStyles.chatContainer} mb-3 rounded`}>
        {messages.length === 0 ? (
          <div className={`text-center ${TypographyStyles.emptyState} mt-8`}>
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 ${MessageStyles[message.role]}`}
                >
                  <div
                    className="whitespace-pre-wrap markdown-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                  />
                  <div className={`text-xs mt-1.5 ${ColorPalette.text.muted}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`${BackgroundStyles.loadingBubble} ${ColorPalette.text.tertiary} p-3 rounded rounded-l-sm`}>
                  <div className={LoadingStyles}>
                    <div className={`w-2 h-2 ${ColorPalette.loading.dot} rounded-full animate-bounce`}></div>
                    <div className={`w-2 h-2 ${ColorPalette.loading.dot} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                    <div className={`w-2 h-2 ${ColorPalette.loading.dot} rounded-full animate-bounce`} style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className={`${NotificationStyles.errorInline} mb-3`}>
          {error}
        </div>
      )}

      <div className={LayoutStyles.inputGroup}>
        <textarea
          value={inputValue}
          ref={inputRef}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          className={`${InputStyles} resize-none`}
          rows={2}
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
          } whitespace-nowrap`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <SpinnerIcon />
              Sending...
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
