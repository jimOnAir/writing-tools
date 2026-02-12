import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { OllamaSettingsSection } from './OllamaSettingsSection';
import type { OllamaSettingsSectionProps } from './OllamaSettingsSection';

describe('OllamaSettingsSection', () => {
  const defaultProps: OllamaSettingsSectionProps = {
    address: 'http://localhost:11434',
    model: 'model1',
    apiKey: '',
    availableModels: ['model1', 'model2'],
    loadingModels: false,
    onAddressChange: jest.fn(),
    onModelChange: jest.fn(),
    onApiKeyChange: jest.fn(),
    onRefreshModels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all input fields', () => {
    render(<OllamaSettingsSection {...defaultProps} />);

    expect(screen.getByLabelText('Ollama Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Ollama API Key (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Model')).toBeInTheDocument();
  });

  it('calls onAddressChange when address is changed', () => {
    render(<OllamaSettingsSection {...defaultProps} />);

    const addressInput = screen.getByLabelText('Ollama Address');
    fireEvent.change(addressInput, { target: { value: 'http://custom:11434' } });

    expect(defaultProps.onAddressChange).toHaveBeenCalledWith('http://custom:11434');
  });

  it('calls onModelChange when model is changed', () => {
    render(<OllamaSettingsSection {...defaultProps} />);

    const modelSelect = screen.getByLabelText('Default Model');
    fireEvent.change(modelSelect, { target: { value: 'model2' } });

    expect(defaultProps.onModelChange).toHaveBeenCalledWith('model2');
  });

  it('calls onApiKeyChange when API key is changed', () => {
    render(<OllamaSettingsSection {...defaultProps} />);

    const apiKeyInput = screen.getByLabelText('Ollama API Key (Optional)');
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });

    expect(defaultProps.onApiKeyChange).toHaveBeenCalledWith('new-key');
  });

  it('calls onRefreshModels when refresh button is clicked', () => {
    render(<OllamaSettingsSection {...defaultProps} />);

    const refreshButton = screen.getByText('Refresh Models');
    fireEvent.click(refreshButton);

    expect(defaultProps.onRefreshModels).toHaveBeenCalled();
  });

  it('disables refresh button when loading', () => {
    render(<OllamaSettingsSection {...defaultProps} loadingModels />);

    const refreshButton = screen.getByText('Loading...');
    expect(refreshButton.closest('button')).toBeDisabled();
  });

  it('displays available models in select', () => {
    render(<OllamaSettingsSection {...defaultProps} />);

    const modelSelect = screen.getByLabelText('Default Model');
    expect(modelSelect).toHaveValue('model1');

    const options = Array.from(modelSelect.querySelectorAll('option'));
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('model1');
    expect(options[1]).toHaveTextContent('model2');
  });

  it('shows loading message when loading models', () => {
    render(<OllamaSettingsSection {...defaultProps} loadingModels />);

    expect(screen.getByText('Fetching available models...')).toBeInTheDocument();
  });

  it('shows provider unavailable message when availabilityStatus is unavailable', () => {
    render(<OllamaSettingsSection {...defaultProps} availabilityStatus="unavailable" />);

    expect(
      screen.getByText('Provider unavailable. Check the address and ensure Ollama is running.'),
    ).toBeInTheDocument();
  });

  it('does not show provider unavailable message when availabilityStatus is available', () => {
    render(<OllamaSettingsSection {...defaultProps} availabilityStatus="available" />);

    expect(
      screen.queryByText('Provider unavailable. Check the address and ensure Ollama is running.'),
    ).not.toBeInTheDocument();
  });

  it('does not show provider unavailable message when availabilityStatus is unknown', () => {
    render(<OllamaSettingsSection {...defaultProps} availabilityStatus="unknown" />);

    expect(
      screen.queryByText('Provider unavailable. Check the address and ensure Ollama is running.'),
    ).not.toBeInTheDocument();
  });
});
