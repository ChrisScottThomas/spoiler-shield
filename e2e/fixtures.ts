import path from 'node:path';
import { test as base, chromium, expect, type BrowserContext } from '@playwright/test';
import { ATTR, PLACEHOLDER_ID } from '../src/core/constants';

export interface Leak {
  tag: string;
  mode: string | null;
  url: string;
  text: string;
}

// Runs in the page before YouTube's scripts. Reports any visible element that
// shows comment text while comments should be Hidden. It does not trust the
// extension's own mode: 'revealed' is exempt only on the video the test revealed
// (window.__ssRevealedFor, set by the test before clicking), and 'inactive' only
// off the Watch Page. Leaving that video forgets it, so a Reveal that comes back
// on Back is a leak too.
const LEAK_MONITOR = `(() => {
  const reported = new WeakSet();
  const exempt = (mode) => {
    const video = new URLSearchParams(location.search).get('v');
    if (window.__ssRevealedFor && video !== window.__ssRevealedFor) window.__ssRevealedFor = null;
    if (mode === 'revealed') return video !== null && video === window.__ssRevealedFor;
    if (mode === 'inactive') return location.pathname !== '/watch';
    return false;
  };
  const tick = () => {
    const mode = document.documentElement.getAttribute(${JSON.stringify(ATTR)});
    if (!exempt(mode)) {
      for (const el of document.querySelectorAll('*')) {
        if (!el.tagName.includes('COMMENT') && el.id !== 'comment-teaser') continue;
        if (reported.has(el) || el.closest(${JSON.stringify('#' + PLACEHOLDER_ID)})) continue;
        const text = (el.textContent || '').trim();
        if (text && el.checkVisibility() && el.getBoundingClientRect().height > 0) {
          reported.add(el);
          window.__ssReportLeak?.({ tag: el.tagName.toLowerCase(), mode, url: location.href, text: text.slice(0, 80) });
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

export const test = base.extend<{ leaks: Leak[]; context: BrowserContext; noLeaks: void }>({
  leaks: async ({}, use) => {
    await use([]);
  },
  context: async ({ leaks }, use) => {
    const extension = path.resolve('dist');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    });
    // Skip the EU/UK cookie-consent interstitial.
    await context.addCookies([
      { name: 'SOCS', value: 'CAI', domain: '.youtube.com', path: '/', secure: true, sameSite: 'Lax' },
    ]);
    await context.exposeFunction('__ssReportLeak', (leak: Leak) => leaks.push(leak));
    await context.addInitScript(LEAK_MONITOR);
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
  noLeaks: [
    async ({ leaks }, use) => {
      await use();
      expect(leaks, 'comment text was visible while comments were Hidden').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
