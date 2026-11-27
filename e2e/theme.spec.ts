import type { Locator, Page } from '@playwright/test';
import { TEXT } from '../src/content/placeholder';
import { PLACEHOLDER_ID } from '../src/core/constants';
import { expect, test, type YouTubeTheme } from './fixtures';
import { openWatch } from './youtube';

/**
 * WCAG contrast ratio between an element's text colour and the colour actually
 * painted behind it: every ancestor's background composited from <html> down.
 */
async function textContrast(target: Locator): Promise<number> {
  return target.evaluate((el) => {
    const parse = (c: string): [number, number, number, number] => {
      const n = c.match(/[\d.]+/g)!.map(Number);
      return [n[0]!, n[1]!, n[2]!, n[3] ?? 1];
    };
    const over = (top: number[], bottom: number[]) => {
      const a = top[3]!;
      return [0, 1, 2].map((i) => top[i]! * a + bottom[i]! * (1 - a)).concat(1);
    };
    const chain: Element[] = [];
    for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
    let bg = [255, 255, 255, 1];
    for (const e of chain) bg = over(parse(getComputedStyle(e).backgroundColor), bg);
    const fg = over(parse(getComputedStyle(el).color), bg);
    const lum = (c: number[]) => {
      const [r, g, b] = c.slice(0, 3).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  });
}

async function placeholderOn(page: Page): Promise<Locator> {
  await openWatch(page);
  const placeholder = page.locator(`#${PLACEHOLDER_ID}`);
  await placeholder.scrollIntoViewIfNeeded();
  await expect(placeholder.getByRole('button', { name: TEXT.show })).toBeVisible();
  return placeholder;
}

for (const theme of ['light', 'dark'] as YouTubeTheme[]) {
  test.describe(`${theme} theme`, () => {
    test.use({ youtubeTheme: theme });

    test('the Placeholder text and button are readable', async ({ page }) => {
      const placeholder = await placeholderOn(page);
      expect(await page.locator('html').evaluate((h) => h.hasAttribute('dark'))).toBe(theme === 'dark');
      // WCAG AA for normal text is 4.5:1.
      expect(await textContrast(placeholder.getByText(TEXT.hidden))).toBeGreaterThanOrEqual(4.5);
      expect(await textContrast(placeholder.getByText(TEXT.explainer))).toBeGreaterThanOrEqual(4.5);
      expect(await textContrast(placeholder.getByRole('button', { name: TEXT.show }))).toBeGreaterThanOrEqual(4.5);
    });
  });
}
