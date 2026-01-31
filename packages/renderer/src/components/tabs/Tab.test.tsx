import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { ChatService } from '../../domains/chat';
import type { ITabInfo } from '../../domains/multi-chat';

import { Tab, type TabProps } from './Tab';

const mockChatServiceForTab = {} as unknown as ChatService;

// Mock getNativeStyles
jest.mock('../../styles/NativeStyles', () => ({
  getNativeStyles: jest.fn(() => ({
    tabs: {
      tab: {
        base: 'tab-base',
        active: 'tab-active',
        inactive: 'tab-inactive',
        closeButton: 'close-button',
      },
    },
  })),
}));

describe('Tab', () => {
  const mockTab: ITabInfo = {
    chatId: 1,
    chatService: mockChatServiceForTab,
    tabId: 'tab-1',
    title: 'Test Chat',
    type: 'chat',
  };

  const defaultProps: TabProps = {
    tab: mockTab,
    isActive: false,
    onSelect: jest.fn(),
    onClose: jest.fn(),
    platform: 'linux',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tab with title', () => {
    render(<Tab {...defaultProps} />);

    expect(screen.getByText('Test Chat')).toBeInTheDocument();
  });

  it('displays "New Tab" when title is empty', () => {
    const tabWithoutTitle: ITabInfo = {
      ...mockTab,
      title: null,
    };

    render(<Tab {...defaultProps} tab={tabWithoutTitle} />);

    expect(screen.getByText('New Tab')).toBeInTheDocument();
  });

  it('displays "New Tab" when title is whitespace', () => {
    const tabWithWhitespace: ITabInfo = {
      ...mockTab,
      title: '   ',
    };

    render(<Tab {...defaultProps} tab={tabWithWhitespace} />);

    expect(screen.getByText('New Tab')).toBeInTheDocument();
  });

  it('calls onSelect when tab is clicked', () => {
    const onSelect = jest.fn();
    render(<Tab {...defaultProps} onSelect={onSelect} />);

    const tabButton = screen.getByLabelText('Switch to tab: Test Chat');
    fireEvent.click(tabButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Tab {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close tab');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents event propagation when close button is clicked', () => {
    const onClose = jest.fn();
    const onSelect = jest.fn();

    render(<Tab {...defaultProps} onClose={onClose} onSelect={onSelect} />);

    const closeButton = screen.getByLabelText('Close tab');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    fireEvent(closeButton, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('applies active styles when isActive is true', () => {
    const { container } = render(<Tab {...defaultProps} isActive />);

    const tabElement = container.firstChild;
    expect(tabElement).toHaveClass('tab-active');
  });

  it('applies inactive styles when isActive is false', () => {
    const { container } = render(<Tab {...defaultProps} isActive={false} />);

    const tabElement = container.firstChild;
    expect(tabElement).toHaveClass('tab-inactive');
  });

  it('has correct accessibility attributes', () => {
    render(<Tab {...defaultProps} />);

    expect(screen.getByLabelText('Switch to tab: Test Chat')).toBeInTheDocument();
    expect(screen.getByLabelText('Close tab')).toBeInTheDocument();
  });
});
