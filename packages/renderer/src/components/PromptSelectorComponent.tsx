import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React, { useState, useEffect, useMemo } from 'react';

import { PromptSelectorService } from '../domains/prompt-selector';
import { ElectronIpcAdapter } from '../infrastructure/ipc';
import { ButtonStyles, InputStyles } from '../styles/Styles';
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
    <div className="flex flex-col h-full p-4 w-full bg-gray-900">
      <h1 className="text-xl font-bold mb-4 text-white">Select a Prompt</h1>

      <div className="mb-4 p-3 bg-gray-800 rounded flex-1 overflow-y-auto">
        <p
          className="whitespace-pre-wrap markdown-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedText) }}
        ></p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-300">Preconfigured Prompts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {preconfiguredPrompts.map((prompt) => (
            <button
              key={`${prompt.title}-${prompt.prompt}`}
              onClick={() => {
                void handlePromptSelect(prompt.prompt);
              }}
              className="p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex items-center">
                {prompt.icon ? (
                  <img
                    src={prompt.icon}
                    alt={prompt.title}
                    className="w-6 h-6 mr-2 object-contain"
                  />
                ) : null}
                <div className="font-medium text-white">{prompt.title}</div>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {prompt.prompt.replace(/\{text\}/g, '...')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3 text-gray-300">Or enter your own prompt</h2>
      <div className="flex items-center space-x-2">
        <textarea
          value={customPrompt}
          onChange={(e) => {
            setCustomPrompt(e.target.value);
          }}
          rows={5}
          onKeyDown={handleKeyPress}
          placeholder="Enter your custom prompt here..."
          className={InputStyles}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => {
              void handleCustomPromptSubmit();
            }}
            disabled={customPrompt.trim() === ''}
            className={`${ButtonStyles.base} ${
              customPrompt.trim() === ''
                ? ButtonStyles.disabled
                : ButtonStyles.primary
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptSelectorComponent;
