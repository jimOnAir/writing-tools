import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { LMStudioSettingsSection } from './LMStudioSettingsSection';
import type { LMStudioSettingsSectionProps } from './LMStudioSettingsSection';

describe('LMStudioSettingsSection', () => {
  const defaultProps: LMStudioSettingsSectionProps = {
    address: 'http://localhost:1234',
    model: 'test-model',
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
    render(<LMStudioSettingsSection {...defaultProps} />);

    expect(screen.getByLabelText('LM Studio Address')).toBeInTheDocument();
    expect(screen.getByLabelText('LM Studio API Key (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('LM Studio Model')).toBeInTheDocument();
  });

  it('calls onAddressChange when address is changed', () => {
    render(<LMStudioSettingsSection {...defaultProps} />);

    const addressInput = screen.getByLabelText('LM Studio Address');
    fireEvent.change(addressInput, { target: { value: 'http://custom:1234' } });

    expect(defaultProps.onAddressChange).toHaveBeenCalledWith('http://custom:1234');
  });

  it('calls onModelChange when model is changed', () => {
    render(<LMStudioSettingsSection {...defaultProps} />);

    const modelSelect = screen.getByLabelText('LM Studio Model');
    fireEvent.change(modelSelect, { target: { value: 'model2' } });

    expect(defaultProps.onModelChange).toHaveBeenCalledWith('model2');
  });

  it('calls onApiKeyChange when API key is changed', () => {
    render(<LMStudioSettingsSection {...defaultProps} />);

    const apiKeyInput = screen.getByLabelText('LM Studio API Key (Optional)');
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });

    expect(defaultProps.onApiKeyChange).toHaveBeenCalledWith('new-key');
  });

  it('calls onRefreshModels when refresh button is clicked', () => {
    render(<LMStudioSettingsSection {...defaultProps} />);

    const refreshButton = screen.getByText('Refresh Models');
    fireEvent.click(refreshButton);

    expect(defaultProps.onRefreshModels).toHaveBeenCalled();
  });

  it('disables refresh button when loading', () => {
    render(<LMStudioSettingsSection {...defaultProps} loadingModels />);

    const refreshButton = screen.getByText('Loading...');
    expect(refreshButton.closest('button')).toBeDisabled();
  });

  it('shows loading message when loading models', () => {
    render(<LMStudioSettingsSection {...defaultProps} loadingModels />);

    expect(screen.getByText('Fetching available models...')).toBeInTheDocument();
  });
});
