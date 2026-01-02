import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React, { useState, useEffect, useMemo } from 'react';

import { PromptSelectorService } from '../domains/prompt-selector';
import { ElectronIpcAdapter } from '../infrastructure/ipc';
import { ButtonStyles, InputStyles, BackgroundStyles, TypographyStyles, CardStyles, LayoutStyles, ColorPalette } from '../styles/Styles';
import { renderMarkdown } from '../utils/markdownRenderer';

const PromptSelectorComponent: React.FC = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [preconfiguredPrompts, setPreconfiguredPrompts] = useState<IPreconfiguredPrompt[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Create service instance
  const promptSelectorService = useMemo(() => {
    const ipcAdapter = new ElectronIpcAdapter();
    const service = new PromptSelectorService(ipcAdapter);

    // Register callbacks
    service.setCallbacks({
      onSelectedTextChange: setSelectedText,
      onPromptsChange: setPreconfiguredPrompts,
    });

    return service;
  }, []);

  // Initialize listeners on mount
  useEffect(() => {
    promptSelectorService.initializeListeners();

    return () => {
      promptSelectorService.cleanupListeners();
    };
  }, [promptSelectorService]);

  const handlePromptSelect = async (promptTemplate: string) => {
    try {
      await promptSelectorService.selectPrompt(promptTemplate);
    } catch {
      // Error is already logged in the service
    }
  };

  const handleCustomPromptSubmit = async () => {
    if (customPrompt.trim()) {
      try {
        await promptSelectorService.submitCustomPrompt(customPrompt);
        setCustomPrompt('');
      } catch {
        // Error is already logged in the service
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleCustomPromptSubmit();
    }
  };

  return (
    <div className={`flex flex-col h-full p-4 w-full ${BackgroundStyles.main}`}>
      <h1 className={TypographyStyles.h1}>Select a Prompt</h1>

      <div className={`mb-3 p-3 ${BackgroundStyles.card} flex-1 overflow-y-auto min-h-[100px] rounded`}>
        {selectedText ? (
          <p
            className="whitespace-pre-wrap markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedText) }}
          ></p>
        ) : (
          <p className={TypographyStyles.emptyState}>No text selected. Select some text first.</p>
        )}
      </div>

      <div className={LayoutStyles.section}>
        <h2 className={TypographyStyles.h3}>Preconfigured Prompts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {preconfiguredPrompts.map((prompt) => (
            <button
              key={`${prompt.title}-${prompt.prompt}`}
              onClick={() => {
                void handlePromptSelect(prompt.prompt);
              }}
              className={CardStyles.promptCard}
            >
              <div className="flex items-center mb-1">
                {prompt.icon ? (
                  <img
                    src={prompt.icon}
                    alt={prompt.title}
                    className={`w-5 h-5 mr-2 object-contain rounded ${ColorPalette.border.defaultSubtle}`}
                  />
                ) : null}
                <div className={`font-medium ${ColorPalette.text.primary} text-sm`}>{prompt.title}</div>
              </div>
              <div className={`text-xs ${ColorPalette.text.muted} line-clamp-2`}>
                {prompt.prompt.replace(/\{text\}/g, '...')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <h2 className={TypographyStyles.h3}>Or enter your own prompt</h2>
      <div className={LayoutStyles.inputGroup}>
        <textarea
          value={customPrompt}
          onChange={(e) => {
            setCustomPrompt(e.target.value);
          }}
          rows={2}
          onKeyDown={handleKeyPress}
          placeholder="Enter your custom prompt..."
          className={`${InputStyles} resize-none`}
        />
        <button
          onClick={() => {
            void handleCustomPromptSubmit();
          }}
          disabled={customPrompt.trim() === ''}
          className={`${ButtonStyles.base} ${
            customPrompt.trim() === ''
              ? ButtonStyles.disabled
              : ButtonStyles.primary
          } whitespace-nowrap`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default PromptSelectorComponent;
