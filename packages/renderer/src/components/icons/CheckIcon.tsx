import React from 'react';

interface CheckIconProps {
  readonly className?: string;
  readonly size?: number;
}

export const CheckIcon: React.FC<CheckIconProps> = ({ className = '', size = 16 }) => {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
};
