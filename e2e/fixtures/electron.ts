/**
 * Electron-specific test fixtures
 */

import { test as base } from '@playwright/test';

export const test = base.extend({
  // Add custom fixtures here if needed
});

export { expect } from '@playwright/test';
