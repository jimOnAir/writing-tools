export const ButtonStyles = {
  base: 'px-4 py-2 rounded font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
  success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
  error: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
  disabled: 'bg-gray-400 text-gray-200 cursor-not-allowed',
  outline: 'border border-gray-600 bg-transparent text-white hover:bg-gray-700 focus:ring-gray-500',
  ghost: 'bg-transparent text-white hover:bg-gray-700 focus:ring-gray-500',
};

export const InputStyles = 'w-full p-2 border rounded-lg bg-gray-700 text-white border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export const MessageStyles = {
  user: 'bg-blue-600 text-white rounded-br-none',
  assistant: 'bg-gray-700 text-white rounded-bl-none',
  error: 'bg-red-900 text-red-100',
};

export const LoadingStyles = 'flex space-x-2';

export const ErrorStyles = 'p-3 bg-red-900 text-red-100 rounded-lg';

export const SuccessStyles = 'p-3 bg-green-900 text-green-100 rounded-lg';
