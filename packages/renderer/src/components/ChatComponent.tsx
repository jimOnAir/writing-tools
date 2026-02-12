import type { IChatInfo, IChatMessage, IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import { EStreamingErrorType } from '@writing-tools/shared';
import React, { useMemo, useState, useEffect, useRef } from 'react';

import type { ChatService } from '../domains/chat';
import type { SettingsService } from '../domains/settings';
import type { TAvailableModelsByProvider } from '../domains/settings/SettingsTypes';
import { BackgroundStyles, ButtonSizeStyles, ButtonStyles, CardStyles, ColorPalette, FollowUpStyles, InputStyles, LayoutStyles, LoadingStyles, MessageStyles, NotificationStyles, SpinnerIcon, TypographyStyles } from '../styles/Styles';
import { formatStatistics } from '../utils/formatStatistics';
import { renderMarkdown } from '../utils/markdownRenderer';

import { SendIcon } from './icons';
import { Tooltip } from './Tooltip';

interface ChatComponentProps {
  readonly chatId: number | null;
  readonly chatService: ChatService;
  readonly settingsService: SettingsService;
}

// TODO: add context length indicator

const ChatComponent: React.FC<ChatComponentProps> = ({ chatId, chatService, settingsService }) => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_errorType, setErrorType] = useState<EStreamingErrorType | undefined>(undefined);
  const [_isHandlingResponse, setIsHandlingResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<IChatInfo | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [preconfiguredPrompts, setPreconfiguredPrompts] = useState<IPreconfiguredPrompt[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [modelOverride, setModelOverride] = useState<{ model: string, provider: 'ollama' | 'lmstudio' } | null>(() => chatService.getModelOverride());
  const [availableModelsByProvider, setAvailableModelsByProvider] = useState<TAvailableModelsByProvider>(() => ({
    lmstudio: [],
    ollama: [],
  }));
  const [loadingModels, setLoadingModels] = useState(false);
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasRestoredScrollRef = useRef(false);
  const isSendingRef = useRef<boolean>(false);
  const isComposingRef = useRef<boolean>(false);

  // Register callbacks and sync initial state from service
  useEffect(() => {
    const initialError = chatService.getError();
    if (initialError !== null) {
      setError(initialError);
      setErrorType(chatService.getErrorType());
    }
    setIsLoading(chatService.getIsLoading());
    setIsStreaming(chatService.getIsStreaming());
    chatService.setCallbacks({
      onErrorChange: (msg, type) => {
        setError(msg);
        setErrorType(type);
      },
      onFollowUpQuestionsChange: (dataChatId, questions) => {
        const currentChatId = chatId ?? chatService.getCurrentChatId();
        if (dataChatId === currentChatId) {
          setFollowUpQuestions(questions);
        }
      },
      onHandlingResponseChange: setIsHandlingResponse,
      onLoadingChange: setIsLoading,
      onMessagesChange: setMessages,
      onModelOverrideChange: setModelOverride,
      onPromptsChange: setPreconfiguredPrompts,
      onSelectedTextChange: setSelectedText,
      onStreamingChange: setIsStreaming,
      onTitleChange: setChatTitle,
    });
  }, [chatService, chatId]);

  // Seed prompt-selector state and model override from service
  useEffect(() => {
    setSelectedText(chatService.getSelectedText());
    setPreconfiguredPrompts(chatService.getPreconfiguredPrompts());
    setModelOverride(chatService.getModelOverride());
  }, [chatService]);

  // Restore scroll position after messages render; save on scroll (debounced) and unmount
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    const pos = chatService.getScrollPosition();
    if (scrollEl !== null && messages.length > 0 && !hasRestoredScrollRef.current) {
      hasRestoredScrollRef.current = true;
      scrollEl.scrollTop = pos;
    }
  }, [chatService, messages.length, chatId]);

  useEffect(() => {
    hasRestoredScrollRef.current = false;
  }, [chatId]);

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;

    const handleScroll = (): void => {
      const el = scrollContainerRef.current;
      if (el !== null) {
        chatService.setScrollPosition(el.scrollTop);
      }
    };

    scrollEl?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      const el = scrollContainerRef.current;
      if (el !== null) {
        chatService.setScrollPosition(el.scrollTop);
      }
      scrollEl?.removeEventListener('scroll', handleScroll);
    };
  }, [chatService]);

  // Load messages if chatId is provided
  useEffect(() => {
    if (chatId !== null) {
      void chatService.loadChatMessages(chatId);
    }
  }, [chatService, chatId]);

  // Settings for display and available models for model dropdown (do not register onSettingsChange so chat never overwrites the service's settings)
  useEffect(() => {
    settingsService.setCallbacks({
      onAvailableModelsChange: setAvailableModelsByProvider,
      onLoadingModelsChange: setLoadingModels,
    });
    setAvailableModelsByProvider(settingsService.getAvailableModelsByProvider());
    const load = async () => {
      try {
        const loaded = await settingsService.loadSettingsForDisplay();
        setSettings(loaded);
      } catch {
        setSettings(null);
      }
    };
    void load();
  }, [settingsService]);

  // Scroll to bottom only during streaming to keep the latest content visible
  // Do not scroll when switching tabs or loading messages (preserves user's scroll position)
  useEffect(() => {
    if (isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isStreaming]);

  // Fetch title and chatInfo when chatId or messages change
  useEffect(() => {
    const fetchTitle = async () => {
      const currentChatId = chatId ?? chatService.getCurrentChatId();
      if (currentChatId === null) {
        setChatTitle(null);
        setChatInfo(null);

        return;
      }

      const info = await chatService.getChatInfo(currentChatId);
      if (info === null) {
        setChatTitle(null);
        setChatInfo(null);

        return;
      }

      setChatTitle(info.title);
      setChatInfo(info);
      chatService.seedModelOverrideFromChatInfo(info);
    };

    void fetchTitle();
  }, [chatService, chatId, messages]);

  const handleCopyMessage = async (messageId: string, content: string): Promise<void> => {
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

  // Effective model and provider for display and send (modelOverride ?? chatInfo ?? settings default)
  const effectiveModel = useMemo(() => {
    if (modelOverride?.model !== undefined && modelOverride.model !== '') {
      return modelOverride.model;
    }
    if (chatInfo?.model !== undefined && chatInfo.model !== '') {
      return chatInfo.model;
    }
    if (settings !== null) {
      const provider = settings.provider ?? 'ollama';

      return provider === 'lmstudio'
        ? (settings.lmstudio.model ?? '')
        : (settings.ollama.model ?? '');
    }

    return '';
  }, [chatInfo?.model, modelOverride?.model, settings]);

  const effectiveProvider = useMemo((): 'ollama' | 'lmstudio' => {
    if (modelOverride?.provider !== undefined) {
      return modelOverride.provider;
    }
    if (chatInfo?.provider === 'ollama' || chatInfo?.provider === 'lmstudio') {
      return chatInfo.provider;
    }

    return (settings?.provider ?? 'ollama');
  }, [chatInfo?.provider, modelOverride?.provider, settings?.provider]);

  const modelOptions = useMemo(() => {
    const list = effectiveProvider === 'lmstudio' ? availableModelsByProvider.lmstudio : availableModelsByProvider.ollama;
    if (effectiveModel !== '' && !list.includes(effectiveModel)) {
      return [effectiveModel, ...list];
    }
    if (list.length > 0) {
      return list;
    }
    if (effectiveModel !== '') {
      return [effectiveModel];
    }

    return [];
  }, [availableModelsByProvider.lmstudio, availableModelsByProvider.ollama, effectiveModel, effectiveProvider]);

  // Handle sending a message
  const handleSendMessage = async (messageText?: string) => {
    const text = messageText ?? inputValue;
    // Prevent double submission using ref for immediate check
    if (isSendingRef.current || isLoading || !text.trim()) {
      return;
    }
    isSendingRef.current = true;
    setFollowUpQuestions(null);
    try {
      const options = effectiveModel !== ''
        ? { model: effectiveModel, provider: effectiveProvider }
        : undefined;
      const errorText = await chatService.sendMessage(text, options);
      if (errorText === null && messageText === undefined) {
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

  // Show prompt-selector UI only when chatService has prompt data
  const showPromptSelector = chatService.getSelectedText() !== '' || chatService.getPreconfiguredPrompts().length > 0;

  const handlePromptSelect = async (prompt: IPreconfiguredPrompt): Promise<void> => {
    try {
      await chatService.selectPrompt(prompt);
    } catch {
      // Error is already logged in the service
    }
  };

  const handleCustomPromptSubmit = async (): Promise<void> => {
    if (customPrompt.trim() !== '') {
      try {
        await chatService.submitCustomPrompt(customPrompt);
        setCustomPrompt('');
      } catch {
        // Error is already logged in the service
      }
    }
  };

  const handlePromptKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleCustomPromptSubmit();
    }
  };

  if (showPromptSelector) {
    return (
      <div className={`flex flex-col flex-1 min-h-0 overflow-hidden p-4 w-full ${BackgroundStyles.main}`}>
        <h1 className={TypographyStyles.h1}>Select a Prompt</h1>

        <div className={`mb-3 p-3 ${BackgroundStyles.card} flex-1 overflow-y-auto min-h-[100px] rounded`}>
          {selectedText !== '' ? (
            <p
              className="whitespace-pre-wrap markdown-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedText) }}
            />
          ) : (
            <p className={TypographyStyles.emptyState}>No text selected. Select some text first.</p>
          )}
        </div>

        <div className={LayoutStyles.section}>
          <h2 className={TypographyStyles.h3}>Preconfigured Prompts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {preconfiguredPrompts.map((prompt) => {
              const providerDisplay = prompt.provider ?? 'Default';
              const modelDisplay = prompt.model ?? 'Default';
              const modelTooltip = prompt.model ?? 'Uses default model from settings';

              return (
                <button
                  key={`${prompt.title}-${prompt.prompt}`}
                  onClick={() => {
                    void handlePromptSelect(prompt);
                  }}
                  className={CardStyles.promptCard}
                  type="button"
                >
                  <div className="flex items-center mb-1">
                    {prompt.icon !== undefined && prompt.icon !== '' ? (
                      <img
                        alt={prompt.title}
                        className="w-5 h-5 mr-2 object-contain rounded"
                        src={prompt.icon}
                      />
                    ) : null}
                    <div className={`font-medium ${ColorPalette.text.primary} text-sm`}>{prompt.title}</div>
                  </div>
                  <div className={`text-xs ${ColorPalette.text.muted} line-clamp-2 mb-2`}>
                    {prompt.prompt.replaceAll('{text}', '...')}
                  </div>
                  <div className={`text-xs ${ColorPalette.text.muted} flex items-center gap-2`}>
                    <span>Provider: {providerDisplay}</span>
                    <span>|</span>
                    <Tooltip content={modelTooltip}>
                      <span className="truncate">
                        Model: {modelDisplay}
                      </span>
                    </Tooltip>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <h2 className={TypographyStyles.h3}>Or enter your own prompt</h2>
        <div className={`${LayoutStyles.inputGroup} w-full`}>
          <div className="min-w-0 flex-1">
            <textarea
              className={`${InputStyles} w-full resize-none`}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
              }}
              onKeyDown={handlePromptKeyPress}
              placeholder="Enter your custom prompt..."
              rows={4}
              value={customPrompt}
            />
          </div>
          <Tooltip content="Send">
            <button
              aria-label="Send"
              className={`${ButtonStyles.base} ${ButtonSizeStyles.default} flex-shrink-0 ${
                customPrompt.trim() === ''
                  ? ButtonStyles.disabled
                  : ButtonStyles.primary
              } whitespace-nowrap`}
              disabled={customPrompt.trim() === ''}
              onClick={() => {
                void handleCustomPromptSubmit();
              }}
              type="button"
            >
              <SendIcon size={20} />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

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
      <div
        ref={scrollContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 ${BackgroundStyles.chatContainer} mb-3 rounded`}
      >
        {messages.length === 0 ? (
          <div className={`text-center ${TypographyStyles.emptyState} mt-8`}>
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              // Check if this is the last message and it's streaming
              const isLastMessage = index === messages.length - 1;
              const isEmptyAssistantPlaceholder = isLastMessage && message.role === 'assistant' && message.content.trim() === '';
              const hidePlaceholderBubble = isEmptyAssistantPlaceholder && (isLoading || isStreaming);
              const isStreamingMessage = isStreaming && isLastMessage && message.role === 'assistant' && message.content.trim() !== '';
              const isErrorMessage = message.role === 'assistant' && message.content.startsWith('Error:');
              const messageBubbleStyle = isErrorMessage ? MessageStyles.error : MessageStyles[message.role];
              let errorTypeLabel: string | null = null;
              let errorDisplayContent = message.content;
              if (isErrorMessage) {
                if (message.errorType === EStreamingErrorType.NETWORK) {
                  errorTypeLabel = 'Connection error';
                  errorDisplayContent = 'Connection failed. Please ensure Ollama (or LM Studio) is running and reachable.';
                } else if (message.errorType === EStreamingErrorType.STREAMING) {
                  errorTypeLabel = 'Streaming error';
                } else {
                  errorTypeLabel = 'Error';
                }
              }

              if (hidePlaceholderBubble) {
                return <div key={message.id} className="min-h-0" aria-hidden="true" />;
              }

              return (
                <div
                  key={message.id}
                  className={`group flex flex-col space-y-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`min-w-[200px] max-w-[80%] p-3 ${messageBubbleStyle}`}
                    >
                      {errorTypeLabel !== null && (
                        <div className={`text-xs font-medium ${ColorPalette.text.muted} mb-1`}>
                          {errorTypeLabel}
                        </div>
                      )}
                      {/* TODO: long markdown doesn't fit */}
                      <div
                        className="whitespace-pre-wrap markdown-content markdown-message"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(errorDisplayContent) + (isStreamingMessage ? '<span class="streaming-cursor">▋</span>' : ''),
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
                      {isLastMessage && isErrorMessage && (
                        <Tooltip content="Retry sending the last message">
                          <button
                            type="button"
                            className={`${ButtonStyles.base} ${ButtonSizeStyles.small} ${ButtonStyles.ghost} whitespace-nowrap`}
                            disabled={isLoading}
                            onClick={() => {
                              void chatService.retryLastMessage(
                                effectiveModel !== '' ? { model: effectiveModel, provider: effectiveProvider } : undefined,
                              );
                            }}
                            aria-label="Retry sending the last message"
                          >
                            <span
                              className="relative inline-block w-3 h-3"
                              style={{ fontSize: '20px', lineHeight: '20px' }}
                            >
                              <span className="absolute inset-0 flex items-center justify-center">
                                ↻
                              </span>
                            </span>
                          </button>
                        </Tooltip>
                      )}
                      {message.role === 'assistant' && message.statistics !== undefined && (
                        <Tooltip content={formatStatistics(message.statistics)}>
                          <button
                            type="button"
                            className={`${ButtonStyles.base} ${ButtonSizeStyles.small} ${ButtonStyles.ghost} whitespace-nowrap`}
                            aria-label="Show message statistics"
                          >
                            <span
                              className="relative inline-block w-3 h-3"
                              style={{ fontSize: '20px', lineHeight: '20px' }}
                            >
                              <span className="absolute inset-0 flex items-center justify-center">
                                ℹ
                              </span>
                            </span>
                          </button>
                        </Tooltip>
                      )}
                      {!isErrorMessage && (
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {followUpQuestions !== null && followUpQuestions.length > 0 && messages.length > 0 && !isStreaming && (() => {
              const lastMessage = messages.at(-1);
              if (lastMessage === undefined || lastMessage.role !== 'assistant') {
                return null;
              }

              return (
                <div className={FollowUpStyles.container}>
                  <span className={FollowUpStyles.label}>Suggested follow-ups</span>
                  <div className="flex flex-wrap gap-2">
                    {followUpQuestions.map((question, index) => (
                      <button
                        key={`${String(index)}-${question.slice(0, 20)}`}
                        type="button"
                        className={FollowUpStyles.button}
                        onClick={() => {
                          setFollowUpQuestions(null);
                          void handleSendMessage(question);
                        }}
                        aria-label={`Send follow-up: ${question}`}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            {(() => {
              const lastMessage = messages.at(-1);
              const lastIsAssistantPlaceholder = lastMessage !== undefined && lastMessage.role === 'assistant' && lastMessage.content.trim() === '';
              const showLoadingBubble = isLoading && (!isStreaming || lastIsAssistantPlaceholder);
              if (!showLoadingBubble) {
                return null;
              }

              return (
                <div className="flex justify-start">
                  <div className={`${BackgroundStyles.loadingBubble} ${ColorPalette.text.tertiary} p-3 rounded rounded-l-sm`}>
                    <div className={LoadingStyles}>
                      <div className={`w-2 h-2 ${ColorPalette.loading.dot} rounded-full animate-bounce`}></div>
                      <div className={`w-2 h-2 ${ColorPalette.loading.dot} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                      <div className={`w-2 h-2 ${ColorPalette.loading.dot} rounded-full animate-bounce`} style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={`flex flex-col flex-shrink-0 ${BackgroundStyles.main}`}>
        {error !== null && !error.startsWith('Streaming error:') && (
          <div className={`${NotificationStyles.errorInline} mb-3 flex-shrink-0`}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 flex-shrink-0 mb-3">
          <label htmlFor="model" className={TypographyStyles.label}>
            Model
          </label>
          <select
            id="model"
            value={effectiveModel}
            onChange={(e) => {
              const selectedModel = e.target.value;
              const provider = (settings?.provider ?? 'ollama');
              chatService.setModelOverride(selectedModel !== '' ? { model: selectedModel, provider } : null);
            }}
            className={InputStyles}
            disabled={loadingModels}
          >
            {modelOptions.length === 0 && effectiveModel === '' ? (
              <option value="">—</option>
            ) : null}
            {modelOptions.map((modelOption) => (
              <option key={modelOption} value={modelOption}>
                {modelOption}
              </option>
            ))}
          </select>
          {loadingModels && (
            <div className={`text-sm ${ColorPalette.text.muted}`}>
              Fetching available models...
            </div>
          )}
        </div>

        <div className={`${LayoutStyles.inputGroup} flex-shrink-0 w-full`}>
          <div className="min-w-0 flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
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
              className={`${InputStyles} w-full resize-none`}
              rows={4}
              disabled={isLoading}
            />
          </div>
          <Tooltip content="Send">
            <button
              aria-label="Send"
              className={`${ButtonStyles.base} ${ButtonSizeStyles.default} flex h-10 w-10 flex-shrink-0 items-center justify-center p-0 ${
                isLoading || !inputValue.trim()
                  ? ButtonStyles.disabled
                  : ButtonStyles.primary
              }`}
              disabled={isLoading || !inputValue.trim()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleSendMessage();
              }}
              type="button"
            >
              {isLoading ? (
                <span className="flex [&_svg]:m-0">
                  <SpinnerIcon />
                </span>
              ) : (
                <SendIcon
                  className={`shrink-0 ${ColorPalette.text.primary}`}
                  size={20}
                />
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
