# Writing Tools Desktop App

A desktop application built with React and Electron.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run electron-dev
   ```

3. Run the Electron app in watch mode:
   ```bash
   npm run electron-dev:watch
   ```

4. Build the Electron app:
   ```bash
   npm run electron:build
   ```

## Project Structure

- `src/main.ts` - Electron main process
- `src/` - React components (renderer process)
- `electron-builder.json` - Electron builder configuration

## Available Scripts

- `npm start` - Start the React development server
- `npm run electron:start` - Run the Electron app
- `npm run electron-dev` - Run both React and Electron in development mode
- `npm run electron-dev:watch` - Run React in watch mode, TypeScript compile in watch mode, and Electron with nodemon watch
- `npm run electron:build` - Build the Electron app for distribution
