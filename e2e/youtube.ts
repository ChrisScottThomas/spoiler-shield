import type { Page } from '@playwright/test';

/** "Me at the zoo": YouTube's first video. Permanently online with comments on. */
export const VIDEO = 'jNQXAC9IVRw';

export async function openWatch(page: Page, id = VIDEO): Promise<void> {
  await page.goto(`https://www.youtube.com/watch?v=${id}`);
  if (new URL(page.url()).hostname.startsWith('consent.')) {
    await page.getByRole('button', { name: /reject all/i }).first().click();
    await page.waitForURL(/www\.youtube\.com\/watch/);
  }
  await page.locator('ytd-watch-flexy').waitFor();
}

/** Scrolls down the page the way a viewer would, giving YouTube time to lazy-load. */
export async function scrollThroughPage(page: Page, steps = 8): Promise<void> {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(500);
  }
}

/** After a Reveal: scrolls until YouTube has loaded and shown a comment. */
export async function scrollUntilCommentsShow(page: Page): Promise<void> {
  const thread = page.locator('ytd-comment-thread-renderer').first();
  for (let i = 0; i < 15; i++) {
    if (await thread.isVisible()) return;
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(700);
  }
  throw new Error('Comments never showed after a Reveal');
}
