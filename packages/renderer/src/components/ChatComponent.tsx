import type { IChatMessage } from '@writing-tools/shared';
import React, { useState, useEffect, useRef } from 'react';

import type { ChatService } from '../domains/chat';
import { ButtonStyles, ButtonSizeStyles, MessageStyles, InputStyles, NotificationStyles, LoadingStyles, BackgroundStyles, LayoutStyles, SpinnerIcon, ColorPalette, TypographyStyles } from '../styles/Styles';
import { formatStatistics } from '../utils/formatStatistics';
import { renderMarkdown } from '../utils/markdownRenderer';

import { Tooltip } from './Tooltip';

interface ChatComponentProps {
  readonly chatService: ChatService;
  readonly chatId: number | null;
}

// TODO: Keep chat position when while switching tabs
// TODO: add model chooser for next message
// TODO: add edit users message
// TODO: add resending message
const ChatComponent: React.FC<ChatComponentProps> = ({ chatService, chatId }) => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // TODO: Proper error handing, now it's just written as message
  const [isHandlingResponse, setIsHandlingResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef<boolean>(false);
  const isComposingRef = useRef<boolean>(false);

  // Register callbacks
  useEffect(() => {
    chatService.setCallbacks({
      onMessagesChange: setMessages,
      onLoadingChange: setIsLoading,
      onErrorChange: setError,
      onHandlingResponseChange: setIsHandlingResponse,
      onTitleChange: setChatTitle,
      onStreamingChange: setIsStreaming,
    });
  }, [chatService]);

  // Note: Listeners are initialized by MultiChatService when creating tabs
  // We only clean them up when the component unmounts (but MultiChatService handles cleanup when tabs close)
  // This cleanup is a safety measure in case component unmounts without tab closing
  useEffect(() => {
    return () => {
      // Only cleanup if this is not being handled by MultiChatService
      // In practice, MultiChatService handles cleanup, but this is a safety measure
    };
  }, [chatService]);

  // Load messages if chatId is provided
  useEffect(() => {
    if (chatId !== null) {
      void chatService.loadChatMessages(chatId);
    }
  }, [chatService, chatId]);

  // Scroll to bottom when messages change
  // During streaming, use auto-scroll to keep the latest content visible
  useEffect(() => {
    if (isStreaming) {
      // During streaming, scroll immediately without smooth animation for better UX
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else if (!isHandlingResponse) {
      scrollToBottom();
    }
  }, [messages, isHandlingResponse, isStreaming]);

  // Fetch title when chatId or messages change
  useEffect(() => {
    const fetchTitle = async () => {
      const currentChatId = chatId ?? chatService.getCurrentChatId();
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
  }, [chatService, chatId, messages]);

  // Auto-scroll when messages change
  useEffect(() => {
    // Scroll behavior is handled in the earlier useEffect
  }, [messages, isStreaming]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyMessage = async (messageId: string, content: string): Promise<void> => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current));
      }, 1500);
    } catch {
      // Silently ignore copy errors to avoid disrupting the chat experience
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    // Prevent double submission using ref for immediate check
    if (isSendingRef.current || isLoading || !inputValue.trim()) {
      return;
    }
    isSendingRef.current = true;
    try {
      const errorText = await chatService.sendMessage(inputValue);
      if (!errorText) {
        setInputValue('');
      }
    } finally {
      isSendingRef.current = false;
    }
  };

  // Handle keyboard interactions in the input (sending, history navigation)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Do not attempt to send while IME composition is active
    // This ensures Enter during composition doesn't accidentally send
    if (isComposingRef.current) {
      return;
    }

    if (e.key === 'Enter') {
      // Shift+Enter: allow newline for multi-line input
      if (e.shiftKey) {
        return;
      }

      // Enter (or Ctrl/Cmd+Enter) sends the message
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }

      void handleSendMessage();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else if (e.key === 'ArrowUp') { // TODO: only on text start
      e.preventDefault();
      const historyValue = chatService.navigateHistoryUp();
      if (historyValue !== null) {
        setInputValue(historyValue);
      }
    } else if (e.key === 'ArrowDown') { // TODO: only on text end
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
  const hasActiveChat = chatId !== null || chatService.getCurrentChatId() !== null || messages.length > 0;
  const displayTitle = chatTitle !== null && chatTitle.trim() !== '' ? chatTitle : null;

  return (
    <div className={`flex flex-col flex-1 min-h-0 overflow-hidden w-full ${LayoutStyles.container}`}>
      {hasActiveChat && (
        <div className="mb-4 pb-4 flex-shrink-0">
          {displayTitle === null ? (
            <div className={`${TypographyStyles.h2} ${ColorPalette.text.muted}`}>
              New Chat
            </div>
          ) : (
            <div
              className={`${TypographyStyles.h2} ${ColorPalette.text.primary} markdown-content`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(displayTitle) }}
            />
          )}
        </div>
      )}
      {/* TODO: make responsive */}
      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 ${BackgroundStyles.chatContainer} mb-3 rounded`}>
        {messages.length === 0 ? (
          <div className={`text-center ${TypographyStyles.emptyState} mt-8`}>
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              // Check if this is the last message and it's streaming
              const isLastMessage = index === messages.length - 1;
              const isStreamingMessage = isStreaming && isLastMessage && message.role === 'assistant';

              return (
                <div
                  key={message.id}
                  className={`group flex flex-col space-y-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`min-w-[200px] max-w-[80%] p-3 ${MessageStyles[message.role]}`}
                    >
                      {/* TODO: long markdown doesn't fit */}
                      <div
                        className="whitespace-pre-wrap markdown-content markdown-message"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(message.content) + (isStreamingMessage ? '<span class="streaming-cursor">▋</span>' : ''),
                        }}
                      />
                      {!isStreamingMessage && (
                        <div className={`text-xs ${ColorPalette.text.muted}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isStreamingMessage && (
                    <div
                      className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'} opacity-0 transition-opacity duration-150 group-hover:opacity-100`}
                    >
                      {message.role === 'assistant' && message.statistics !== undefined && ( // TODO: resend button in case of error
                        <Tooltip content={formatStatistics(message.statistics)}>
                          <button
                            type="button"
                            className={`${ButtonStyles.base} ${ButtonSizeStyles.small} ${ButtonStyles.ghost} whitespace-nowrap`}
                            aria-label="Show message statistics"
                          >
                            <span
                              className="inline-block w-3 h-3"
                              style={{ fontSize: '14px', lineHeight: '14px' }}
                            >
                              ℹ
                            </span>
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content="Copy message">
                        <button
                          type="button"
                          className={`${ButtonStyles.base} ${ButtonSizeStyles.small} ${ButtonStyles.ghost} whitespace-nowrap`}
                          onClick={() => {
                            void handleCopyMessage(message.id, message.content);
                          }}
                          aria-label="Copy message to clipboard"
                        >
                          <span
                            className="relative inline-block w-3 h-3"
                            style={{ fontSize: '20px', lineHeight: '20px' }}
                          >
                            <span
                              className={`
                                absolute inset-0 flex items-center justify-center
                                transition-all duration-150
                                ${copiedMessageId === message.id ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
                              `}
                            >
                              ⧉
                            </span>
                            <span
                              className={`
                                absolute inset-0 flex items-center justify-center
                                transition-all duration-150
                                ${copiedMessageId === message.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                              `}
                            >
                              ✓
                            </span>
                          </span>
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })}
            {/* TODO: Add follow-up questions links */}
            {isLoading && !isStreaming && (
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
        <div className={`${NotificationStyles.errorInline} mb-3 flex-shrink-0`}>
          {error}
        </div>
      )}

      <div className={`${LayoutStyles.inputGroup} flex-shrink-0`}>
        <textarea
          value={inputValue}
          ref={inputRef}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          className={`${InputStyles} resize-none`}
          rows={2}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleSendMessage();
          }}
          disabled={isLoading || !inputValue.trim()}
          className={`${ButtonStyles.base} ${ButtonSizeStyles.default} ${
            isLoading || !inputValue.trim()
              ? ButtonStyles.disabled
              : ButtonStyles.primary
          } whitespace-nowrap`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <SpinnerIcon />
              {/* TODO: Think on better naming  */}
              Sending...
            </span>
          ) : (
            'Send' // TODO: replace with icon
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
