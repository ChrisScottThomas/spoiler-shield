import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { openWatch, scrollThroughPage, scrollUntilCommentsShow, VIDEO } from './youtube';

const placeholderOf = (page: Page) => page.locator('#spoiler-shield-placeholder');
const modeOf = (page: Page) => page.locator('html');

async function reveal(page: Page): Promise<void> {
  const placeholder = placeholderOf(page);
  await placeholder.scrollIntoViewIfNeeded();
  await placeholder.getByRole('button', { name: 'Show comments' }).click();
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'revealed');
}

test('Reveal shows comments, and Hide comments hides them again', async ({ page }) => {
  await openWatch(page);
  await reveal(page);
  await scrollUntilCommentsShow(page);

  await placeholderOf(page).getByRole('button', { name: 'Hide comments' }).click();
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await expect(page.locator('ytd-comment-thread-renderer').first()).toBeHidden();
  await expect(placeholderOf(page)).toContainText('Comments hidden by Spoiler Shield');
  await scrollThroughPage(page, 4);
});

test('a Reveal does not carry over to the next video, or come back on Back', async ({ page }) => {
  await openWatch(page);
  await reveal(page);
  await scrollUntilCommentsShow(page);
  await page.evaluate(() => ((window as unknown as { __ssSamePage: boolean }).__ssSamePage = true));

  const next = page.locator(`#secondary a[href*="/watch?v="]:not([href*="${VIDEO}"])`).filter({ visible: true }).first();
  await next.click();
  await page.waitForURL((url) => !url.href.includes(VIDEO));
  // Same document: an in-page navigation, the same path autoplay takes.
  expect(await page.evaluate(() => (window as unknown as { __ssSamePage?: boolean }).__ssSamePage)).toBe(true);
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await expect(placeholderOf(page).getByRole('button', { name: 'Show comments' })).toBeVisible();

  await page.goBack();
  await page.waitForURL(new RegExp(VIDEO));
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await expect(placeholderOf(page).getByRole('button', { name: 'Show comments' })).toBeVisible();
});

test('a Reveal does not survive a refresh', async ({ page }) => {
  await openWatch(page);
  await reveal(page);
  await page.reload();
  await page.locator('ytd-watch-flexy').waitFor();
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await expect(placeholderOf(page).getByRole('button', { name: 'Show comments' })).toBeVisible();
});

test('the explainer shows until the first Reveal, then never again', async ({ page }) => {
  await openWatch(page);
  const explainer = 'Comments are hidden on every video so nothing spoils the result.';
  await expect(placeholderOf(page)).toContainText(explainer);
  await reveal(page);
  await placeholderOf(page).getByRole('button', { name: 'Hide comments' }).click();
  await expect(placeholderOf(page)).not.toContainText(explainer);
  await page.reload();
  await expect(placeholderOf(page)).toContainText('Comments hidden by Spoiler Shield');
  await expect(placeholderOf(page)).not.toContainText(explainer);
});

test('comments stay hidden in a narrow window (comment teaser layout)', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await openWatch(page);
  await expect(page.locator('#comment-teaser').first()).toBeAttached();
  await expect(page.locator('#comment-teaser').first()).toBeHidden();
  await scrollThroughPage(page);
  // noLeaks catches any visible teaser or comment.
});

test('pages other than the Watch Page are left alone', async ({ page }) => {
  await page.goto('https://www.youtube.com/');
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'inactive');
  await expect(placeholderOf(page)).toHaveCount(0);
});
