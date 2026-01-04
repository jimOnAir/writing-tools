/**
 * E2E test helper utilities
 */

export async function waitForAppReady(page: any): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

export async function takeScreenshot(page: any, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}
