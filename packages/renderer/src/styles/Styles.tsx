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
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-200',
    tertiary: 'text-gray-300',
    muted: 'text-gray-400',
    disabled: 'text-gray-500',
  },
  button: {
    primary: 'bg-gray-700',
    primaryHover: 'hover:bg-gray-600',
    primaryBorder: 'border-gray-600',
    secondary: 'bg-gray-700/80',
    secondaryHover: 'hover:bg-gray-600/80',
    success: 'bg-gray-600',
    successHover: 'hover:bg-gray-500',
    successBorder: 'border-gray-500',
    error: 'bg-gray-700/90',
    errorHover: 'hover:bg-gray-600/90',
    cancel: 'bg-gray-800/60',
    cancelHover: 'hover:bg-gray-800/80',
    disabled: 'bg-gray-800/40',
  },
  loading: {
    dot: 'bg-gray-500',
  },
};

// Background styles
export const BackgroundStyles = {
  main: ColorPalette.background.main,
  card: `${ColorPalette.background.card} rounded ${ColorPalette.border.defaultSubtle}`,
  cardHover: `${ColorPalette.background.card} rounded ${ColorPalette.border.defaultSubtle} ${ColorPalette.background.cardHover} transition-colors`,
  cardDense: `${ColorPalette.background.card} rounded ${ColorPalette.border.defaultSubtle}`,
  chatContainer: `${ColorPalette.background.card} rounded ${ColorPalette.border.defaultSubtle}`,
  loadingBubble: `${ColorPalette.background.loading} rounded ${ColorPalette.border.defaultSubtle}`,
};

// Button styles
export const ButtonStyles = {
  base: 'px-4 py-2 rounded font-medium transition-all duration-200 cursor-pointer '
    + 'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900',
  primary: `${ColorPalette.button.primary} ${ColorPalette.button.primaryHover} ${ColorPalette.text.primary} `
    + `border ${ColorPalette.button.primaryBorder} hover:border-gray-500 hover:shadow-lg hover:shadow-gray-700/50 active:scale-[0.98]`,
  secondary: `${ColorPalette.button.secondary} ${ColorPalette.button.secondaryHover} ${ColorPalette.text.primary} `
    + `border ${ColorPalette.border.lightMedium} hover:border-gray-500 hover:shadow-lg hover:shadow-gray-700/50 active:scale-[0.98]`,
  success: `${ColorPalette.button.success} ${ColorPalette.button.successHover} ${ColorPalette.text.primary} `
    + `border ${ColorPalette.button.successBorder} hover:border-gray-400 hover:shadow-lg hover:shadow-gray-600/50 active:scale-[0.98]`,
  error: `${ColorPalette.button.error} ${ColorPalette.button.errorHover} ${ColorPalette.text.secondary} `
    + `border ${ColorPalette.border.light} hover:border-gray-500 hover:shadow-lg hover:shadow-gray-700/50 active:scale-[0.98]`,
  warning: `${ColorPalette.button.secondary} ${ColorPalette.button.secondaryHover} ${ColorPalette.text.primary} `
    + `border ${ColorPalette.border.lightMedium} hover:border-gray-500 hover:shadow-lg hover:shadow-gray-700/50 active:scale-[0.98]`,
  disabled: `${ColorPalette.button.disabled} ${ColorPalette.text.disabled} cursor-not-allowed border ${ColorPalette.border.defaultSubtle}`,
  outline: `border ${ColorPalette.border.lightMedium} bg-transparent ${ColorPalette.text.tertiary} `
    + `${ColorPalette.background.cardHover} hover:border-gray-500 hover:shadow-md hover:shadow-gray-700/30 active:scale-[0.98]`,
  ghost: `bg-transparent ${ColorPalette.text.tertiary} ${ColorPalette.background.cardHover} border border-transparent `
    + `hover:border-gray-600/50 hover:shadow-sm hover:shadow-gray-700/20 active:scale-[0.98]`,
  cancel: `border ${ColorPalette.border.lightStrong} ${ColorPalette.button.cancel} ${ColorPalette.button.cancelHover} `
    + `${ColorPalette.text.tertiary} hover:border-gray-500 hover:shadow-md hover:shadow-gray-700/30 active:scale-[0.98]`,
};

// Input styles
export const InputStyles
  = `w-full px-3 py-2 border rounded ${ColorPalette.background.card} `
  + `${ColorPalette.text.primary} ${ColorPalette.border.defaultLight} `
  + `focus:ring-1 focus:ring-gray-500 focus:border-gray-600 transition-colors `
  + `placeholder:${ColorPalette.text.disabled}`;

// File input styles
export const FileInputStyles: {
  readonly wrapper: string,
  readonly input: string,
  readonly label: string,
} = {
  wrapper: 'relative inline-block',
  input: 'hidden',
  label:
    `px-4 py-2 rounded font-medium transition-all duration-200 focus:outline-none focus:ring-2 `
    + `focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 border `
    + `${ColorPalette.border.lightMedium} bg-transparent ${ColorPalette.text.tertiary} `
    + `${ColorPalette.background.cardHover} cursor-pointer inline-block hover:border-gray-500 `
    + `hover:shadow-md hover:shadow-gray-700/30 active:scale-[0.98]`,
} as const;

// Message styles
export const MessageStyles = {
  user: `${ColorPalette.button.primary} ${ColorPalette.text.primary} rounded rounded-r-sm ${ColorPalette.border.lightSubtle}`,
  assistant: `${ColorPalette.background.card} ${ColorPalette.text.secondary} rounded rounded-l-sm ${ColorPalette.border.defaultLight}`,
  error: `bg-gray-800/80 ${ColorPalette.text.tertiary} rounded ${ColorPalette.border.defaultMedium}`,
};

// Loading styles
export const LoadingStyles = 'flex space-x-2 items-center';

// Notification styles
export const NotificationStyles = {
  error: `p-3 ${ColorPalette.background.card} ${ColorPalette.border.defaultMedium} ${ColorPalette.text.tertiary} rounded mb-4`,
  success: `p-3 ${ColorPalette.background.card} ${ColorPalette.border.defaultMedium} ${ColorPalette.text.tertiary} rounded mb-4`,
  errorInline: `p-3 ${ColorPalette.background.card} ${ColorPalette.text.tertiary} rounded ${ColorPalette.border.defaultMedium}`,
};

// Typography styles
export const TypographyStyles = {
  h1: `text-xl font-medium mb-4 ${ColorPalette.text.primary}`,
  h2: `text-lg font-medium mb-3 ${ColorPalette.text.primary}`,
  h3: `text-base font-medium mb-2 ${ColorPalette.text.tertiary}`,
  h4: `font-medium mb-2 ${ColorPalette.text.tertiary}`,
  label: `block mb-1.5 text-sm ${ColorPalette.text.tertiary}`,
  emptyState: ColorPalette.text.disabled,
  description: `${ColorPalette.text.muted} mb-4 text-sm`,
  subtitle: `${ColorPalette.text.muted} mb-6 text-sm`,
};

// Layout styles
export const LayoutStyles = {
  container: 'max-w-4xl mx-auto',
  inputGroup: 'flex items-start space-x-2',
  section: 'mb-6',
  sectionCard: 'mb-6 p-4',
  divider: `border-t ${ColorPalette.border.defaultLight}`,
};

// Card styles
export const CardStyles = {
  promptCard: `${BackgroundStyles.cardHover} p-3 text-left cursor-pointer border ${ColorPalette.border.defaultSubtle} `
    + `hover:border-gray-600/50 hover:shadow-lg hover:shadow-gray-700/30 transition-all duration-200 active:scale-[0.98]`,
  settingsCard: `${BackgroundStyles.card} p-4`,
  promptItemCard: `${BackgroundStyles.cardDense} p-4`,
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
