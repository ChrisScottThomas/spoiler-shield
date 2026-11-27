// Lists every element on a live Watch Page whose tag or id mentions "comment",
// in a wide and a narrow window, then the ones COMMENT_SELECTORS doesn't cover.
// Run it whenever YouTube changes its layout.
import { chromium } from '@playwright/test';
import { COMMENT_SELECTORS } from '../src/core/selectors';

const VIDEO = 'jNQXAC9IVRw';

const browser = await chromium.launch();
for (const width of [1280, 600]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, locale: 'en-US' });
  await page.context().addCookies([
    { name: 'SOCS', value: 'CAI', domain: '.youtube.com', path: '/', secure: true, sameSite: 'Lax' },
  ]);
  await page.goto(`https://www.youtube.com/watch?v=${VIDEO}`);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(700);
  }
  const { found, uncovered } = await page.evaluate((covered) => {
    const out = new Set<string>();
    // Comment-named elements with no ancestor-or-self matching COMMENT_SELECTORS, and their text.
    const loose = new Map<string, string>();
    for (const el of document.querySelectorAll('*')) {
      const names: string[] = [];
      const tag = el.tagName.toLowerCase();
      if (tag.includes('comment')) names.push(tag);
      // el.id is not always a string (e.g. a <form> with an input named "id"), so read the attribute.
      const id = el.getAttribute('id') ?? '';
      if (id.toLowerCase().includes('comment')) names.push(`${tag}#${id}`);
      const target = el.getAttribute('target-id');
      if (target?.includes('comment')) names.push(`${tag}[target-id="${target}"]`);
      for (const name of names) out.add(name);
      if (names.length > 0 && !el.closest(covered)) {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
        for (const name of names) if (!loose.get(name)) loose.set(name, text);
      }
    }
    return {
      found: [...out].sort(),
      uncovered: [...loose].sort(([a], [b]) => a.localeCompare(b)).map(([name, text]) => (text ? `${name}  "${text}"` : name)),
    };
  }, COMMENT_SELECTORS.join(', '));
  console.log(`\n=== width ${width} ===\n${found.join('\n')}`);
  console.log(`\n=== UNCOVERED width ${width} ===\n${uncovered.join('\n') || '(none)'}`);
  await page.close();
}
await browser.close();
