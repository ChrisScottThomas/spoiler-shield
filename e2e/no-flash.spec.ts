import { expect, test } from './fixtures';
import { openWatch, scrollThroughPage } from './youtube';

test.describe('Hidden by default', () => {
  test('comment text is never visible while loading and scrolling a Watch Page', async ({ page }) => {
    await openWatch(page);
    await scrollThroughPage(page);
    // The noLeaks fixture fails the test if any frame showed comment text.
  });

  test('the Placeholder stands in for the comments', async ({ page }) => {
    await openWatch(page);
    const placeholder = page.locator('#spoiler-shield-placeholder');
    await placeholder.scrollIntoViewIfNeeded();
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Comments hidden by Spoiler Shield');
    await expect(placeholder.getByRole('button', { name: 'Show comments' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-spoiler-shield', 'hidden');
  });
});
