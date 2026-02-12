import React from 'react';

interface StopIconProps {
  readonly className?: string;
  readonly size?: number;
}

export const StopIcon: React.FC<StopIconProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      className={className}
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <rect height="14" width="14" x="5" y="5" />
    </svg>
  );
};
