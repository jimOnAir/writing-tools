import { EIpcChannel, logger, EIpcEvent } from '@writing-tools/shared';
import type { IPreconfiguredPrompt, TIpcEvent, IPromptSelectorData } from '@writing-tools/shared';
import React, { useState, useEffect } from 'react';
import { ButtonStyles, InputStyles } from 'src/styles/Styles';
import { renderMarkdown } from 'src/utils/markdownRenderer';

import type { TIpcRenderListener } from '../types/TIpcRenderListener';

const PromptSelectorComponent: React.FC = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [preconfiguredPrompts, setPreconfiguredPrompts] = useState<IPreconfiguredPrompt[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  useEffect(() => {
    // Listen for prompt selector data from main process
    const handlePromptSelectorData = (data: IPromptSelectorData) => {
      console.log(data);
      setSelectedText(data.selectedText);
      setPreconfiguredPrompts(data.preconfiguredPrompts);
    };

    let promptSelectorDatalistener: TIpcRenderListener;
    if (typeof window.electronAPI !== 'undefined') {
      promptSelectorDatalistener = window.electronAPI.onPromptSelectorData(handlePromptSelectorData);
    }

    return () => {
      window.electronAPI.offPromptSelectorData(promptSelectorDatalistener);
    };
  }, []);

  const handlePromptSelect = (promptTemplate: string) => {
    // Replace {text} with the selected text
    let prompt = promptTemplate;
    if (!prompt.includes(`{text}`)) {
      prompt += '\n{text}';
    }
    prompt = prompt.replace(/\{text\}/g, selectedText);

    const payload: TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT> = {
      channel: EIpcChannel.PROMPT_SELECTOR,
      event: EIpcEvent.PROMPT_SELECT,
      payload: {
        prompt,
      },
    };

    window.electronAPI.invoke(EIpcChannel.PROMPT_SELECTOR, payload)
      .catch((err: unknown) => {
        const errorText = err instanceof Error
          ? err.message
          : String(err);

        logger.error('Error selecting prompt:', errorText);
      });
  };

  const handleCustomPromptSubmit = () => {
    if (customPrompt.trim()) {
      // Send the custom prompt to main process
      let prompt = customPrompt;
      if (!prompt.includes(`{text}`)) {
        prompt += '\n{text}';
      }
      prompt = prompt.replace(/\{text\}/g, selectedText);

      const payload: TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT> = {
        channel: EIpcChannel.PROMPT_SELECTOR,
        event: EIpcEvent.PROMPT_SELECT,
        payload: {
          prompt,
        },
      };
      window.electronAPI.invoke(EIpcChannel.PROMPT_SELECTOR, payload)
        .catch((err: unknown) => {
          const errorText = err instanceof Error
            ? err.message
            : String(err);

          logger.error('Error selecting prompt:', errorText);
        });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomPromptSubmit();
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
          {preconfiguredPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => {
                handlePromptSelect(prompt.prompt);
              }}
              className="p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-700 transition-colors text-left"
            >
              <div className="font-medium text-white">{prompt.title}</div>
              <div className="text-sm text-gray-400 mt-1">{prompt.prompt.replace(/\{text\}/g, '...')}</div>
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
            onClick={handleCustomPromptSubmit}
            disabled={!customPrompt.trim()}
            className={`${ButtonStyles.base} ${
              !customPrompt.trim()
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
