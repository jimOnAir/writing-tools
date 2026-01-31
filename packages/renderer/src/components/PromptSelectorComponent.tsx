import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React, { useState, useEffect } from 'react';

import { Tooltip } from '../components/Tooltip';
import type { PromptSelectorService } from '../domains/prompt-selector';
import { ButtonStyles, ButtonSizeStyles, InputStyles, BackgroundStyles, TypographyStyles, CardStyles, LayoutStyles, ColorPalette } from '../styles/Styles';
import { renderMarkdown } from '../utils/markdownRenderer';

interface PromptSelectorComponentProps {
  promptSelectorService: PromptSelectorService;
}

// TODO: Combine with ChatComponent

const PromptSelectorComponent: React.FC<PromptSelectorComponentProps> = ({ promptSelectorService }) => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [preconfiguredPrompts, setPreconfiguredPrompts] = useState<IPreconfiguredPrompt[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Register callbacks and load initial data
  useEffect(() => {
    promptSelectorService.setCallbacks({
      onSelectedTextChange: setSelectedText,
      onPromptsChange: setPreconfiguredPrompts,
    });

    // Load initial data from the service
    setSelectedText(promptSelectorService.getSelectedText());
    setPreconfiguredPrompts(promptSelectorService.getPreconfiguredPrompts());
  }, [promptSelectorService]);

  // Note: Listeners are initialized in MainLayout
  // The service is shared across tabs, so we don't initialize/cleanup here

  const handlePromptSelect = async (prompt: IPreconfiguredPrompt) => {
    try {
      await promptSelectorService.selectPrompt(prompt);
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
    <div className={`flex flex-col flex-1 min-h-0 overflow-hidden p-4 w-full ${BackgroundStyles.main}`}>
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
              >
                <div className="flex items-center mb-1">
                  {prompt.icon ? (
                    <img
                      src={prompt.icon}
                      alt={prompt.title}
                      className="w-5 h-5 mr-2 object-contain rounded"
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
          className={`${ButtonStyles.base} ${ButtonSizeStyles.default} ${
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
