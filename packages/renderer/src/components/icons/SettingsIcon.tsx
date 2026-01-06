import React from 'react';

interface SettingsIconProps {
  readonly className?: string;
  readonly size?: number;
}

export const SettingsIcon: React.FC<SettingsIconProps> = ({ className = '', size = 20 }) => {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m16.97-5.03L18.36 5.64m-12.72 12.72L5.03 18.97m13.94 0L18.36 18.36M5.64 5.64L5.03 5.03" />
    </svg>
  );
};
