import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { renderMarkdown } from '../utils/markdownRenderer';

interface TooltipProps {
  readonly content: string;
  readonly children: React.ReactElement;
  readonly className?: string;
  readonly disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '', disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (): void => {
    if (!disabled) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = (): void => {
    setIsVisible(false);
  };

  const handleDragStart = (): void => {
    setIsVisible(false);
  };

  const handleDragEnd = (): void => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (disabled) {
      setIsVisible(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      // Use setTimeout to ensure tooltip is rendered before calculating position
      const timer = setTimeout(() => {
        if (triggerRef.current && tooltipRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const scrollY = globalThis.window.scrollY || globalThis.window.pageYOffset;
          const scrollX = globalThis.window.scrollX || globalThis.window.pageXOffset;

          // Position tooltip above the element, centered
          let top = rect.top + scrollY - tooltipRect.height - 8;
          let left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;

          const windowWidth = globalThis.window.innerWidth;
          const windowHeight = globalThis.window.innerHeight;
          const padding = 8;

          // Adjust if tooltip goes off screen horizontally
          if (left < scrollX + padding) {
            left = scrollX + padding;
          }
          if (left + tooltipRect.width > scrollX + windowWidth - padding) {
            left = scrollX + windowWidth - tooltipRect.width - padding;
          }

          // Adjust if tooltip goes off screen vertically (top)
          if (top < scrollY + padding) {
            // If tooltip would overflow top, position it below the element instead
            top = rect.bottom + scrollY + 8;
          }

          // Adjust if tooltip goes off screen vertically (bottom)
          if (top + tooltipRect.height > scrollY + windowHeight - padding) {
            // If tooltip would overflow bottom, position it above the element
            top = rect.top + scrollY - tooltipRect.height - 8;
            // If still overflowing, position at top of viewport
            if (top < scrollY + padding) {
              top = scrollY + padding;
            }
          }

          setPosition({ top, left });
        }
      }, 0);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isVisible]);

  // Render markdown content for tooltip
  const renderedContent = renderMarkdown(content);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragStartCapture={handleDragStart}
        onDragEndCapture={handleDragEnd}
        className="inline-flex w-full min-w-0"
        role="tooltip"
      >
        {children}
      </div>
      {isVisible && globalThis.document.body && createPortal(
        <div
          ref={tooltipRef}
          className={`
            fixed z-[9999] px-3 py-2 rounded-lg shadow-xl border
            bg-gray-800 border-gray-700 text-white text-sm max-w-md
            pointer-events-none markdown-content tooltip-content
            break-words overflow-x-hidden box-border w-full
            ${className}
          `}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />,
        globalThis.document.body,
      )}
    </>
  );
};
