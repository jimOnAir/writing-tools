import React from 'react';

// Color palette - centralized color definitions
export const ColorPalette = {
  background: {
    main: 'bg-gray-900',
    card: 'bg-gray-800/40',
    cardHover: 'bg-gray-800/60',
    loading: 'bg-gray-800/60',
  },
  border: {
    default: 'border-gray-700',
    defaultSubtle: 'border-gray-700/20',
    defaultLight: 'border-gray-700/30',
    defaultMedium: 'border-gray-700/40',
    light: 'border-gray-600',
    lightSubtle: 'border-gray-600/30',
    lightMedium: 'border-gray-600/50',
    lightStrong: 'border-gray-600/60',
    accent: 'border-purple-600/50',
    accentHover: 'border-purple-600',
    error: 'border-red-500',
    success: 'border-green-500',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-200',
    tertiary: 'text-gray-300',
    muted: 'text-gray-400',
    disabled: 'text-gray-500',
  },
  button: {
    primary: 'bg-purple-700',
    primaryHover: 'hover:bg-purple-800',
    primaryBorder: 'border-purple-600',
    primaryFocus: 'focus:ring-purple-600',
    secondary: 'bg-gray-700/80',
    secondaryHover: 'hover:bg-gray-600/80',
    success: 'bg-green-600',
    successHover: 'hover:bg-green-700',
    successBorder: 'border-green-500',
    successFocus: 'focus:ring-green-500',
    error: 'bg-red-600',
    errorHover: 'hover:bg-red-700',
    errorBorder: 'border-red-500',
    errorFocus: 'focus:ring-red-500',
    cancel: 'bg-gray-800/60',
    cancelHover: 'hover:bg-gray-800/80',
    disabled: 'bg-gray-800/40',
  },
  loading: {
    dot: 'bg-purple-600',
  },
};

// Background styles
export const BackgroundStyles = {
  main: ColorPalette.background.main,
  card: `${ColorPalette.background.card} rounded-xl shadow-sm`,
  cardHover: `${ColorPalette.background.card} rounded-xl ${ColorPalette.background.cardHover} transition-all duration-300 shadow-md hover:shadow-lg`,
  cardDense: `${ColorPalette.background.card} rounded-xl shadow-sm`,
  chatContainer: `${ColorPalette.background.card} rounded-xl shadow-sm`,
  loadingBubble: `${ColorPalette.background.loading} rounded-xl shadow-sm`,
};

// Button styles
export const ButtonStyles = {
  base: `px-5 py-2.5 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900`,
  primary: `${ColorPalette.button.primary} ${ColorPalette.button.primaryHover} ${ColorPalette.text.primary} ${ColorPalette.button.primaryFocus} hover:shadow-lg hover:shadow-purple-600/30 active:scale-[0.98]`,
  secondary: `${ColorPalette.button.secondary} ${ColorPalette.button.secondaryHover} ${ColorPalette.text.primary} focus:ring-gray-500 hover:shadow-lg hover:shadow-gray-700/50 active:scale-[0.98]`,
  success: `${ColorPalette.button.success} ${ColorPalette.button.successHover} ${ColorPalette.text.primary} ${ColorPalette.button.successFocus} hover:shadow-lg hover:shadow-green-500/30 active:scale-[0.98]`,
  error: `${ColorPalette.button.error} ${ColorPalette.button.errorHover} ${ColorPalette.text.primary} ${ColorPalette.button.errorFocus} hover:shadow-lg hover:shadow-red-500/30 active:scale-[0.98]`,
  warning: `${ColorPalette.button.secondary} ${ColorPalette.button.secondaryHover} ${ColorPalette.text.primary} focus:ring-yellow-500 hover:shadow-lg hover:shadow-yellow-500/30 active:scale-[0.98]`,
  disabled: `${ColorPalette.button.disabled} ${ColorPalette.text.disabled} cursor-not-allowed`,
  outline: `bg-transparent ${ColorPalette.text.tertiary} ${ColorPalette.background.cardHover} focus:ring-purple-600 hover:shadow-md hover:shadow-purple-600/20 active:scale-[0.98]`,
  ghost: `bg-transparent ${ColorPalette.text.tertiary} ${ColorPalette.background.cardHover} focus:ring-purple-600 hover:shadow-sm hover:shadow-gray-700/20 active:scale-[0.98]`,
  cancel: `${ColorPalette.button.cancel} ${ColorPalette.button.cancelHover} ${ColorPalette.text.tertiary} focus:ring-gray-500 hover:shadow-md hover:shadow-gray-700/30 active:scale-[0.98]`,
};

// Input styles
export const InputStyles
  = `w-full px-3 py-2 rounded-lg ${ColorPalette.background.card} ${ColorPalette.text.primary} focus:ring-2 focus:ring-purple-600/50 transition-all duration-300 placeholder:${ColorPalette.text.disabled}`;

// File input styles
export const FileInputStyles: {
  readonly wrapper: string,
  readonly input: string,
  readonly label: string,
} = {
  wrapper: 'relative inline-block',
  input: 'hidden',
  label:
    `px-5 py-2.5 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 focus:ring-offset-gray-900 bg-transparent ${ColorPalette.text.tertiary} ${ColorPalette.background.cardHover} inline-block hover:shadow-md hover:shadow-purple-600/20 active:scale-[0.98]`,
} as const;

// Message styles
export const MessageStyles = {
  user: `${ColorPalette.button.primary} ${ColorPalette.text.primary} rounded-xl rounded-r-sm shadow-md`,
  assistant: `${ColorPalette.background.card} ${ColorPalette.text.secondary} rounded-xl rounded-l-sm shadow-sm`,
  error: `bg-red-900/30 ${ColorPalette.text.tertiary} rounded-xl shadow-sm`,
};

// Loading styles
export const LoadingStyles = 'flex space-x-2 items-center';

// Notification styles
export const NotificationStyles = {
  error: `p-4 ${ColorPalette.background.card} ${ColorPalette.text.tertiary} rounded-xl mb-4 shadow-md`,
  success: `p-4 ${ColorPalette.background.card} ${ColorPalette.text.tertiary} rounded-xl mb-4 shadow-md`,
  errorInline: `p-4 ${ColorPalette.background.card} ${ColorPalette.text.tertiary} rounded-xl shadow-sm`,
};

// Typography styles
export const TypographyStyles = {
  h1: `text-2xl font-semibold mb-6 ${ColorPalette.text.primary} leading-tight`,
  h2: `text-xl font-semibold mb-4 ${ColorPalette.text.primary} leading-tight`,
  h3: `text-base font-medium mb-2.5 ${ColorPalette.text.tertiary} leading-relaxed`,
  h4: `text-sm font-medium mb-2 ${ColorPalette.text.tertiary} leading-relaxed`,
  label: `block mb-2 text-sm font-medium ${ColorPalette.text.tertiary} leading-normal`,
  emptyState: `${ColorPalette.text.disabled} text-sm leading-relaxed`,
  description: `${ColorPalette.text.muted} mb-4 text-sm leading-relaxed`,
  subtitle: `${ColorPalette.text.muted} mb-6 text-sm leading-relaxed`,
};

// Layout styles
export const LayoutStyles = {
  container: 'max-w-4xl mx-auto',
  inputGroup: 'flex items-start space-x-3',
  section: 'mb-8',
  sectionCard: 'mb-8 p-6',
  divider: '',
};

// Card styles
export const CardStyles = {
  promptCard: `${BackgroundStyles.cardHover} p-4 text-left cursor-pointer hover:shadow-lg hover:shadow-purple-600/20 transition-all duration-300 active:scale-[0.98]`,
  promptItemCard: `${BackgroundStyles.cardDense} p-5`,
  settingsCard: `${BackgroundStyles.card} p-6`,
};

// Scrollbar styles
// Note: Scrollbar styling is primarily CSS-based (see App.css)
// This object documents the color scheme used for scrollbars
export const ScrollbarStyles = {
  // Colors match ColorPalette values:
  // Track: gray-800/40 (matches ColorPalette.background.card)
  // Thumb: gray-600/60 (matches ColorPalette.border.lightMedium)
  // Thumb hover: gray-500/80 (lighter for interaction feedback)
  // Border: gray-700/30 (matches ColorPalette.border.defaultLight)
  // Width: 8px, Border radius: 4px
  note: 'Scrollbar styles are defined in App.css using webkit and Firefox scrollbar properties',
};

// Spinner component (for reuse)
export const SpinnerIcon = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
