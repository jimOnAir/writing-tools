import { render, screen } from '@testing-library/react';
import React from 'react';

import { SettingsNotifications } from './SettingsNotifications';

describe('SettingsNotifications', () => {
  it('renders error message when error is provided', () => {
    render(
      <SettingsNotifications
        error="Test error message"
        success={null}
      />,
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders success message when success is provided', () => {
    render(
      <SettingsNotifications
        error={null}
        success="Settings saved successfully!"
      />,
    );

    expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
  });

  it('renders both error and success when both are provided', () => {
    render(
      <SettingsNotifications
        error="Error message"
        success="Success message"
      />,
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('renders nothing when both are null', () => {
    const { container } = render(
      <SettingsNotifications
        error={null}
        success={null}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not render error when error is null', () => {
    render(
      <SettingsNotifications
        error={null}
        success="Success"
      />,
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('does not render success when success is null', () => {
    render(
      <SettingsNotifications
        error="Error"
        success={null}
      />,
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
  });
});
