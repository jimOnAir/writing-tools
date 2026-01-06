import type { TPlatform } from '../utils/platformDetection';

// Platform-specific style definitions
export const NativeStyles = {
  darwin: {
    // macOS styling - translucent, rounded, soft shadows
    sidebar: {
      background: 'bg-gray-800/60 backdrop-blur-xl shadow-lg',
      border: 'border-r border-gray-700/30',
      width: {
        expanded: 'w-96',
        collapsed: 'w-12',
      },
    },
    tabs: {
      container: 'bg-gray-800/40 backdrop-blur-md border-b border-gray-700/30 shadow-sm',
      tab: {
        active: 'bg-gray-900/80 text-white border-l border-r border-t-purple-600/50 shadow-md',
        base: 'px-4 py-2 rounded-t-xl transition-all duration-300 border-t-2 h-[37px] flex items-center overflow-hidden',
        closeButton: 'ml-2 opacity-70 hover:opacity-100 transition-opacity duration-200',
        dragging: 'opacity-75 cursor-grabbing',
        dragOver: 'ring-1 ring-purple-500/60',
        inactive: 'bg-transparent text-gray-400 border-t-transparent hover:text-gray-300 hover:bg-gray-800/40 hover:border-t-gray-600/30',
      },
      newChatButton: 'px-5 py-2.5 rounded-xl bg-purple-700/80 hover:bg-purple-700 text-white transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-purple-600/30',
    },
    header: {
      background: 'bg-gray-800/60 backdrop-blur-xl shadow-sm',
      border: 'border-b border-gray-700/30',
    },
    modal: {
      backdrop: 'bg-black/40 backdrop-blur-sm',
      container: 'bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/30',
    },
    button: {
      primary: 'bg-purple-700/80 hover:bg-purple-700 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-purple-600/30 transition-all duration-300',
      secondary: 'bg-gray-700/60 hover:bg-gray-700/80 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300',
      settings: 'p-2.5 rounded-xl bg-gray-700/50 hover:bg-gray-700/70 text-white transition-all duration-300 shadow-sm hover:shadow-md',
    },
    input: {
      base: 'bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 rounded-xl focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all duration-300',
    },
    font: {
      base: 'font-sans',
      system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
    },
  },
  win32: {
    // Windows styling - solid backgrounds, flatter design
    sidebar: {
      background: 'bg-gray-900 border-r border-gray-800 shadow-md',
      border: 'border-r border-gray-800',
      width: {
        expanded: 'w-96',
        collapsed: 'w-12',
      },
    },
    tabs: {
      container: 'bg-gray-900 border-b border-gray-800 shadow-sm',
      tab: {
        active: 'bg-gray-900 text-white border-t-2 border-t-purple-600 shadow-sm',
        base: 'px-4 py-2 transition-all duration-300',
        closeButton: 'ml-2 opacity-70 hover:opacity-100 transition-opacity duration-200',
        dragging: 'opacity-75 cursor-grabbing',
        dragOver: 'ring-1 ring-purple-500/60',
        inactive: 'bg-gray-950 text-gray-400 hover:text-gray-300 hover:bg-gray-900/80',
      },
      newChatButton: 'px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white transition-all duration-300 border border-purple-600 shadow-sm hover:shadow-md',
    },
    header: {
      background: 'bg-gray-900 shadow-sm',
      border: 'border-b border-gray-800',
    },
    modal: {
      backdrop: 'bg-black/60',
      container: 'bg-gray-900 rounded-xl shadow-2xl border border-gray-800',
    },
    button: {
      primary: 'bg-purple-700 hover:bg-purple-800 text-white transition-all duration-300 shadow-sm hover:shadow-md',
      secondary: 'bg-gray-800 hover:bg-gray-700 text-white transition-all duration-300 shadow-sm hover:shadow-md',
      settings: 'p-2.5 bg-gray-800 hover:bg-gray-700 text-white transition-all duration-300 border border-gray-700 shadow-sm hover:shadow-md',
    },
    input: {
      base: 'bg-gray-900 border border-gray-800 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-300',
    },
    font: {
      base: 'font-sans',
      system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Segoe UI Variable Display", sans-serif',
    },
  },
  linux: {
    // Linux styling - GTK-inspired, moderate transparency
    sidebar: {
      background: 'bg-gray-900/95 backdrop-blur-sm border-r border-gray-800/50 shadow-lg',
      border: 'border-r border-gray-800/50',
      width: {
        expanded: 'w-96',
        collapsed: 'w-12',
      },
    },
    tabs: {
      container: 'bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50 shadow-sm',
      tab: {
        active: 'bg-gray-800/80 text-white border-t-purple-600 shadow-md',
        base: 'px-4 py-2 rounded-t-xl transition-all duration-300 border-t-2 h-[37px] flex items-center overflow-hidden',
        closeButton: 'ml-2 opacity-70 hover:opacity-100 transition-opacity duration-200',
        dragging: 'opacity-75 cursor-grabbing',
        dragOver: 'ring-1 ring-purple-500/60',
        inactive: 'bg-transparent text-gray-400 border-t-transparent hover:text-gray-300 hover:bg-gray-800/50 hover:border-t-gray-600/30',
      },
      newChatButton: 'px-5 py-2.5 rounded-xl bg-purple-700/90 hover:bg-purple-700 text-white transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-purple-600/30',
    },
    header: {
      background: 'bg-gray-900/95 backdrop-blur-sm shadow-sm',
      border: 'border-b border-gray-800/50',
    },
    modal: {
      backdrop: 'bg-black/50 backdrop-blur-sm',
      container: 'bg-gray-900/95 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-800/50',
    },
    button: {
      primary: 'bg-purple-700 hover:bg-purple-800 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-purple-600/30',
      secondary: 'bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md',
      settings: 'p-2.5 rounded-xl bg-gray-800/70 hover:bg-gray-800/90 text-white transition-all duration-300 shadow-sm hover:shadow-md',
    },
    input: {
      base: 'bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all duration-300',
    },
    font: {
      base: 'font-sans',
      system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, Cantarell, sans-serif',
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
