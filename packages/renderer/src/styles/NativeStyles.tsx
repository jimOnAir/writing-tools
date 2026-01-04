import type { TPlatform } from '../utils/platformDetection';

// Platform-specific style definitions
export const NativeStyles = {
  darwin: {
    // macOS styling - translucent, rounded, soft shadows
    sidebar: {
      background: 'bg-gray-800/60 backdrop-blur-xl',
      border: 'border-r border-gray-700/30',
      width: {
        expanded: 'w-64',
        collapsed: 'w-12',
      },
    },
    tabs: {
      container: 'bg-gray-800/40 backdrop-blur-md border-b border-gray-700/30',
      tab: {
        base: 'px-4 py-2 rounded-t-lg transition-all duration-200',
        active: 'bg-gray-900/80 text-white border-t border-l border-r border-gray-700/30',
        inactive: 'bg-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30',
        closeButton: 'ml-2 opacity-70 hover:opacity-100 transition-opacity',
      },
      newChatButton: 'px-4 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 text-white transition-all',
    },
    header: {
      background: 'bg-gray-800/60 backdrop-blur-xl',
      border: 'border-b border-gray-700/30',
    },
    modal: {
      backdrop: 'bg-black/40 backdrop-blur-sm',
      container: 'bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/30',
    },
    button: {
      primary: 'bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg',
      secondary: 'bg-gray-700/60 hover:bg-gray-700/80 text-white rounded-lg',
      settings: 'p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 text-white transition-all',
    },
    input: {
      base: 'bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 rounded-lg focus:ring-2 focus:ring-blue-500/50',
    },
    font: {
      base: 'font-sans',
      system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
    },
  },
  win32: {
    // Windows styling - solid backgrounds, flatter design
    sidebar: {
      background: 'bg-gray-900 border-r border-gray-800',
      border: 'border-r border-gray-800',
      width: {
        expanded: 'w-64',
        collapsed: 'w-12',
      },
    },
    tabs: {
      container: 'bg-gray-900 border-b border-gray-800',
      tab: {
        base: 'px-4 py-2 transition-all duration-150',
        active: 'bg-gray-900 text-white border-t-2 border-t-blue-500',
        inactive: 'bg-gray-950 text-gray-400 hover:text-gray-300 hover:bg-gray-900',
        closeButton: 'ml-2 opacity-70 hover:opacity-100 transition-opacity',
      },
      newChatButton: 'px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white transition-all border border-gray-700',
    },
    header: {
      background: 'bg-gray-900',
      border: 'border-b border-gray-800',
    },
    modal: {
      backdrop: 'bg-black/60',
      container: 'bg-gray-900 rounded-lg shadow-xl border border-gray-800',
    },
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white transition-colors',
      secondary: 'bg-gray-800 hover:bg-gray-700 text-white transition-colors',
      settings: 'p-2 bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-700',
    },
    input: {
      base: 'bg-gray-900 border border-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    },
    font: {
      base: 'font-sans',
      system: '"Segoe UI", "Segoe UI Variable Display", system-ui, sans-serif',
    },
  },
  linux: {
    // Linux styling - GTK-inspired, moderate transparency
    sidebar: {
      background: 'bg-gray-900/95 backdrop-blur-sm border-r border-gray-800/50',
      border: 'border-r border-gray-800/50',
      width: {
        expanded: 'w-64',
        collapsed: 'w-12',
      },
    },
    tabs: {
      container: 'bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50',
      tab: {
        base: 'px-4 py-2 rounded-t-lg transition-all duration-200',
        active: 'bg-gray-800/80 text-white border-t-2 border-t-blue-500',
        inactive: 'bg-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/40',
        closeButton: 'ml-2 opacity-70 hover:opacity-100 transition-opacity',
      },
      newChatButton: 'px-4 py-2 rounded-lg bg-gray-800/70 hover:bg-gray-800/90 text-white transition-all',
    },
    header: {
      background: 'bg-gray-900/95 backdrop-blur-sm',
      border: 'border-b border-gray-800/50',
    },
    modal: {
      backdrop: 'bg-black/50 backdrop-blur-sm',
      container: 'bg-gray-900/95 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-800/50',
    },
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md',
      secondary: 'bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all',
      settings: 'p-2 rounded-lg bg-gray-800/70 hover:bg-gray-800/90 text-white transition-all',
    },
    input: {
      base: 'bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-lg focus:ring-2 focus:ring-blue-500/50',
    },
    font: {
      base: 'font-sans',
      system: 'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, sans-serif',
    },
  },
} as const;

/**
 * Type representing any platform's native styles
 */
export type TNativeStyles = typeof NativeStyles.darwin | typeof NativeStyles.win32 | typeof NativeStyles.linux;

/**
 * Get native styles for the specified platform
 */
export const getNativeStyles = (platform: TPlatform): TNativeStyles => {
  return NativeStyles[platform];
};
