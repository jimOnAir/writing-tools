import React, { useState, useEffect, useRef } from 'react';
import { ButtonStyles, MessageStyles, InputStyles, ErrorStyles, LoadingStyles } from '../styles/Styles';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Check if electronAPI is available (for development mode)
      if (typeof window.electronAPI === 'undefined') {
        // For development/testing, simulate a response
        console.warn('electronAPI not available - simulating Ollama response');
        // Simulate a response for development
        setTimeout(() => {
          const assistantMessage: Message = {
            id: Date.now().toString() + '-response',
            type: 'assistant',
            content: `Simulated response to: "${inputValue.trim()}"`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
        }, 1000);
        return;
      }

      // Get current settings to get Ollama configuration
      const settings = await window.electronAPI.invoke('load-settings');
      const ollamaAddress = settings.ollama?.address || 'http://localhost:11434';
      const model = settings.ollama?.model || 'llama3';

      // Prepare messages for Ollama chat API - send all messages in conversation
      const chatMessages = messages.map(msg => ({
        role: msg.type,
        content: msg.content
      }));

      // Add the new user message to the conversation
      chatMessages.push({
        role: 'user',
        content: inputValue.trim()
      });

      // Send message to Ollama via IPC with full conversation history
      const response = await window.electronAPI.invoke('send-ollama-message', {
        address: ollamaAddress,
        model: model,
        messages: chatMessages
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Add assistant response to chat
      const assistantMessage: Message = {
        id: Date.now().toString() + '-response',
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Failed to send message to Ollama:', err);
      setError(`Failed to send message: ${err.message || 'Unknown error'}`);

      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        type: 'assistant',
        content: `Error: ${err.message || 'Failed to get response from Ollama'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${MessageStyles[message.type]}`}
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
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message here..."
          className={InputStyles}
          rows={2}
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
