import React from 'react';

interface GripIconProps {
  readonly className?: string;
  readonly size?: number;
}

export const GripIcon: React.FC<GripIconProps> = ({ className = '', size = 16 }) => {
  return (
    <svg
      className={`pointer-events-none ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
};
