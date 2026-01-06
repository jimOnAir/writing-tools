import React from 'react';

interface ChevronLeftIconProps {
  readonly className?: string;
  readonly size?: number;
}

export const ChevronLeftIcon: React.FC<ChevronLeftIconProps> = ({ className = '', size = 16 }) => {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
};
