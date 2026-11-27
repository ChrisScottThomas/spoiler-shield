import type { Page } from '@playwright/test';
import { TEXT } from '../src/content/placeholder';
import { ATTR, PLACEHOLDER_ID } from '../src/core/constants';
import { expect, test } from './fixtures';
import { openWatch, scrollThroughPage, scrollUntilCommentsShow, VIDEO } from './youtube';

const placeholderOf = (page: Page) => page.locator(`#${PLACEHOLDER_ID}`);
const modeOf = (page: Page) => page.locator('html');

async function reveal(page: Page): Promise<void> {
  const placeholder = placeholderOf(page);
  await placeholder.scrollIntoViewIfNeeded();
  // The leak monitor exempts 'revealed' only on this video.
  await page.evaluate(() => {
    const w = window as unknown as { __ssRevealedFor: string | null; __ssRevealSeen: boolean };
    w.__ssRevealedFor = new URLSearchParams(location.search).get('v');
    w.__ssRevealSeen = false;
  });
  await placeholder.getByRole('button', { name: TEXT.show }).click();
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'revealed');
}

test('Reveal shows comments, and Hide comments hides them again', async ({ page }) => {
  await openWatch(page);
  await reveal(page);
  await scrollUntilCommentsShow(page);

  await placeholderOf(page).getByRole('button', { name: TEXT.hide }).click();
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await expect(page.locator('ytd-comment-thread-renderer').first()).toBeHidden();
  await expect(placeholderOf(page)).toContainText(TEXT.hidden);
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
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
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await expect(placeholderOf(page).getByRole('button', { name: TEXT.show })).toBeVisible();

  await page.goBack();
  await page.waitForURL(new RegExp(VIDEO));
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await expect(placeholderOf(page).getByRole('button', { name: TEXT.show })).toBeVisible();
});

// Signed out, the home page often lists no videos ("try searching"), so this
// starts from search results: the same in-page navigation into a Watch Page.
test('opening a video from search results hides its comments', async ({ page }) => {
  await page.goto('https://www.youtube.com/results?search_query=nfl+highlights');
  await page.evaluate(() => ((window as unknown as { __ssSamePage: boolean }).__ssSamePage = true));
  // A real video result, not an ad.
  const video = page.locator('ytd-video-renderer a#thumbnail[href*="/watch?v="]').filter({ visible: true }).first();
  await video.click();
  await page.waitForURL(/\/watch\?/);
  // Same document: YouTube's in-page navigation from search results.
  expect(await page.evaluate(() => (window as unknown as { __ssSamePage?: boolean }).__ssSamePage)).toBe(true);
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await expect(placeholderOf(page).getByRole('button', { name: TEXT.show })).toBeVisible();
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  // YouTube did render the comments section; while Hidden its threads never lazy-load.
  await expect(page.locator('ytd-comments#comments')).toBeAttached();
});

test('a Reveal does not survive a refresh', async ({ page }) => {
  await openWatch(page);
  await reveal(page);
  await page.reload();
  await page.locator('ytd-watch-flexy').waitFor();
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await scrollThroughPage(page, 4);
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'hidden');
  await expect(placeholderOf(page).getByRole('button', { name: TEXT.show })).toBeVisible();
});

test('the explainer shows until the first Reveal, then never again', async ({ page }) => {
  await openWatch(page);
  await expect(placeholderOf(page)).toContainText(TEXT.explainer);
  await reveal(page);
  await placeholderOf(page).getByRole('button', { name: TEXT.hide }).click();
  await expect(placeholderOf(page)).not.toContainText(TEXT.explainer);
  await page.reload();
  await expect(placeholderOf(page)).toContainText(TEXT.hidden);
  await expect(placeholderOf(page)).not.toContainText(TEXT.explainer);
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
  await expect(modeOf(page)).toHaveAttribute(ATTR, 'inactive');
  await expect(placeholderOf(page)).toHaveCount(0);
});
