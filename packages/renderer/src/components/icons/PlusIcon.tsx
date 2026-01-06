import React from 'react';

interface PlusIconProps {
  readonly className?: string;
  readonly size?: number;
}

export const PlusIcon: React.FC<PlusIconProps> = ({ className = '', size = 20 }) => {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
};
