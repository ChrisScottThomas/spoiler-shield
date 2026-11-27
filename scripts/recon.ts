// Lists every element on a live Watch Page whose tag or id mentions "comment",
// in a wide and a narrow window. Run it whenever YouTube changes its layout.
import { chromium } from '@playwright/test';

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
  const found = await page.evaluate(() => {
    const out = new Set<string>();
    for (const el of document.querySelectorAll('*')) {
      const tag = el.tagName.toLowerCase();
      if (tag.includes('comment')) out.add(tag);
      // el.id is not always a string (e.g. a <form> with an input named "id"), so read the attribute.
      const id = el.getAttribute('id') ?? '';
      if (id.toLowerCase().includes('comment')) out.add(`${tag}#${id}`);
      const target = el.getAttribute('target-id');
      if (target?.includes('comment')) out.add(`${tag}[target-id="${target}"]`);
    }
    return [...out].sort();
  });
  console.log(`\n=== width ${width} ===\n${found.join('\n')}`);
  await page.close();
}
await browser.close();
