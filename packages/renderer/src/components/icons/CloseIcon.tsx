import React from 'react';

interface CloseIconProps {
  readonly className?: string;
  readonly size?: number;
}

export const CloseIcon: React.FC<CloseIconProps> = ({ className = '', size = 16 }) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
};
