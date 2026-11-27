# Spoiler Shield v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Manifest V3 Chrome extension that hides YouTube comments on every desktop Watch Page by default. A neutral Placeholder offers a one-click Reveal that lasts for one loaded video, and comment text is never visible, not even for a single frame.

**Architecture:** A stylesheet declared in the manifest is injected before YouTube draws anything. It hides every comment element unless `<html data-spoiler-shield>` is `revealed` or `inactive`, so if anything breaks, comments stay hidden (fail closed, ADR 0002). A small content script owns the Reveal state, a pure state machine keyed by video ID. It writes that state to the `<html>` attribute and keeps the Placeholder in place just above YouTube's comments section. Pure logic lives in `src/core/` and is unit-tested. DOM code lives in `src/content/` and is tested with jsdom. Real behaviour is proved by Playwright tests against live youtube.com, with a per-frame leak monitor.

**Tech Stack:** TypeScript, esbuild (run via tsx), Vitest + jsdom, Playwright (bundled Chromium, extension loaded unpacked), sharp (icon rendering), Chrome Manifest V3.

**Read first:** `GLOSSARY.md` (use its terms exactly: Comments, Watch Page, Hidden, Placeholder, Reveal), `docs/adr/0001-hidden-everywhere-with-safe-list.md`, `docs/adr/0002-hide-by-stylesheet-fail-closed.md`.

**Out of scope for v1:** Safe List (v2), Live Chat Replay, titles/thumbnails/duration, Shorts, m.youtube.com, embeds, any master on/off switch, any analytics or network calls.

---

## File structure

```
manifest.json                  Extension manifest (source of truth for name/version/permissions)
package.json, tsconfig.json, vitest.config.ts, playwright.config.ts
icons/icon.svg                 Icon source; icons/icon-{16,48,128}.png generated from it
scripts/build.ts               Bundles content script, generates hide.css, copies manifest + icons → dist/
scripts/icons.ts               Renders icons/icon.svg to PNGs
scripts/recon.ts               Lists YouTube's current comment elements (maintenance tool)
src/core/constants.ts          ATTR and PLACEHOLDER_ID, shared by CSS and script
src/core/url.ts                videoIdFrom(href): Watch Page video ID or null
src/core/state.ts              createRevealState(): the Reveal state machine
src/core/selectors.ts          COMMENT_SELECTORS (everything that can show comment text) + PLACEHOLDER_ANCHOR
src/core/hideCss.ts            buildHideCss(): the stylesheet text
src/content/placeholder.ts     createPlaceholder / renderPlaceholder
src/content/placement.ts       ensurePlaced(): keeps Placeholder directly above the comments section
src/content/explainer.ts       First-time explainer flag in chrome.storage.local
src/content/main.ts            Wiring: YouTube navigation events, MutationObserver, state → DOM
e2e/fixtures.ts                Chromium with extension loaded, consent cookie, leak monitor
e2e/youtube.ts                 Page helpers (open watch page, scroll)
e2e/no-flash.spec.ts           Hidden-by-default + Placeholder tests
e2e/reveal.spec.ts             Reveal, Hide again, navigation, refresh, narrow, explainer, off-watch
docs/privacy.md                Privacy statement for the Web Store listing
docs/release-checklist.md      Manual checks before each release
```

---

### Task 0: Branch

- [ ] **Step 1: Create the working branch**

Run: `git checkout -b v1`
Expected: `Switched to a new branch 'v1'`

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/core/constants.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "spoiler-shield",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsx scripts/build.ts",
    "icons": "tsx scripts/icons.ts",
    "recon": "tsx scripts/recon.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "npm run build && playwright test",
    "package": "npm run build && rm -f spoiler-shield.zip && cd dist && zip -r ../spoiler-shield.zip ."
  }
}
```

- [ ] **Step 2: Install dev dependencies**

Run: `npm install -D typescript esbuild tsx vitest jsdom @playwright/test @types/chrome @types/node sharp && npx playwright install chromium`
Expected: exits 0, and `package-lock.json` is created.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome", "node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "scripts", "e2e", "*.ts"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 5: Create `src/core/constants.ts`**

```ts
/** Attribute on <html> holding the current ShieldMode. The stylesheet keys off it. */
export const ATTR = 'data-spoiler-shield';

/** id of the Placeholder element. */
export const PLACEHOLDER_ID = 'spoiler-shield-placeholder';
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck`
Expected: exits 0, no output.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/core/constants.ts
git commit -m "chore: scaffold TypeScript, Vitest and Playwright"
```

---

### Task 2: Watch Page video ID

A Reveal belongs to one loaded video, so we need a reliable "which video is this?" check. It returns `null` for anything that isn't a Watch Page.

**Files:**
- Create: `src/core/url.ts`
- Test: `src/core/url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { videoIdFrom } from './url';

describe('videoIdFrom', () => {
  it('returns the video ID of a Watch Page', () => {
    expect(videoIdFrom('https://www.youtube.com/watch?v=jNQXAC9IVRw')).toBe('jNQXAC9IVRw');
  });

  it('ignores other query parameters', () => {
    expect(videoIdFrom('https://www.youtube.com/watch?list=PL123&v=jNQXAC9IVRw&t=42s')).toBe('jNQXAC9IVRw');
  });

  it('accepts youtube.com without www', () => {
    expect(videoIdFrom('https://youtube.com/watch?v=jNQXAC9IVRw')).toBe('jNQXAC9IVRw');
  });

  it.each([
    ['home page', 'https://www.youtube.com/'],
    ['search results', 'https://www.youtube.com/results?search_query=nfl'],
    ['Shorts', 'https://www.youtube.com/shorts/jNQXAC9IVRw'],
    ['mobile site', 'https://m.youtube.com/watch?v=jNQXAC9IVRw'],
    ['YouTube Music', 'https://music.youtube.com/watch?v=jNQXAC9IVRw'],
    ['missing v', 'https://www.youtube.com/watch'],
    ['malformed v', 'https://www.youtube.com/watch?v=short'],
    ['not a URL', 'not a url'],
  ])('returns null for %s', (_label, href) => {
    expect(videoIdFrom(href)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `npx vitest run src/core/url.test.ts`
Expected: FAIL, with a "Failed to resolve import ./url" error.

- [ ] **Step 3: Implement**

```ts
const WATCH_HOSTS = new Set(['www.youtube.com', 'youtube.com']);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** The video ID if href is a desktop Watch Page, otherwise null. */
export function videoIdFrom(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!WATCH_HOSTS.has(url.hostname) || url.pathname !== '/watch') return null;
  const id = url.searchParams.get('v');
  return id !== null && VIDEO_ID.test(id) ? id : null;
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `npx vitest run src/core/url.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/url.ts src/core/url.test.ts
git commit -m "feat: identify the video on a Watch Page"
```

---

### Task 3: Reveal state machine

This holds the rules agreed in Q6, Q7 and Q14. Comments are Hidden by default. A Reveal belongs to the one loaded video. Moving to a different video (autoplay, a click, Back) clears it, and the comments are always Hidden while a navigation is in progress. A refresh or a new tab is a fresh content script, so it starts Hidden automatically.

**Files:**
- Create: `src/core/state.ts`
- Test: `src/core/state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createRevealState } from './state';

const A = 'aaaaaaaaaaa';
const B = 'bbbbbbbbbbb';

describe('createRevealState', () => {
  it('is inactive before any page is known', () => {
    expect(createRevealState().mode()).toBe('inactive');
  });

  it('hides comments on a Watch Page by default', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    expect(s.mode()).toBe('hidden');
  });

  it('is inactive off the Watch Page', () => {
    const s = createRevealState();
    s.navigatedTo(null);
    expect(s.mode()).toBe('inactive');
  });

  it('reveals comments for the current video', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    s.reveal();
    expect(s.mode()).toBe('revealed');
  });

  it('hides them again after a Reveal', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    s.reveal();
    s.hide();
    expect(s.mode()).toBe('hidden');
  });

  it('does not carry a Reveal to the next video (autoplay, click)', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    s.reveal();
    s.navigatedTo(B);
    expect(s.mode()).toBe('hidden');
  });

  it('does not restore a Reveal when going Back to the revealed video', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    s.reveal();
    s.navigatedTo(B);
    s.navigatedTo(A);
    expect(s.mode()).toBe('hidden');
  });

  it('keeps a Reveal when YouTube re-navigates to the same video', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    s.reveal();
    s.navigatedTo(A);
    expect(s.mode()).toBe('revealed');
  });

  it('clears a Reveal after leaving the Watch Page and coming back', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    s.reveal();
    s.navigatedTo(null);
    s.navigatedTo(A);
    expect(s.mode()).toBe('hidden');
  });

  it('hides comments while a navigation is in progress, even after a Reveal', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    s.reveal();
    s.navigationStarted();
    expect(s.mode()).toBe('hidden');
  });

  it('ignores a Reveal off the Watch Page', () => {
    const s = createRevealState();
    s.navigatedTo(null);
    s.reveal();
    expect(s.mode()).toBe('inactive');
  });

  it('reports the current video', () => {
    const s = createRevealState();
    s.navigatedTo(A);
    expect(s.currentVideoId()).toBe(A);
  });
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `npx vitest run src/core/state.test.ts`
Expected: FAIL, with a "Failed to resolve import ./state" error.

- [ ] **Step 3: Implement**

```ts
/** What the stylesheet should do right now. Written to <html data-spoiler-shield>. */
export type ShieldMode = 'hidden' | 'revealed' | 'inactive';

export interface RevealState {
  /** YouTube began moving to another page; hide until we know where we landed. */
  navigationStarted(): void;
  /** The page is now this Watch Page video, or null for any other page. */
  navigatedTo(videoId: string | null): void;
  reveal(): void;
  hide(): void;
  mode(): ShieldMode;
  currentVideoId(): string | null;
}

export function createRevealState(): RevealState {
  let current: string | null = null;
  let revealed: string | null = null;
  let navigating = false;

  return {
    navigationStarted() {
      navigating = true;
    },
    navigatedTo(videoId) {
      if (videoId !== current) revealed = null;
      current = videoId;
      navigating = false;
    },
    reveal() {
      if (current === null) return;
      revealed = current;
      navigating = false;
    },
    hide() {
      revealed = null;
    },
    mode() {
      if (navigating) return 'hidden';
      if (current === null) return 'inactive';
      return revealed === current ? 'revealed' : 'hidden';
    },
    currentVideoId() {
      return current;
    },
  };
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `npx vitest run src/core/state.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/state.ts src/core/state.test.ts
git commit -m "feat: Reveal state that lasts for one loaded video"
```

---

### Task 4: Comment selectors, checked against live YouTube

"Comments" means any comment text on the Watch Page (glossary): the comments section, the one-comment teaser in narrow windows, highlighted or pinned comments, and the comments side panel. YouTube renames its elements from time to time, so first record what's on the live site today.

**Files:**
- Create: `scripts/recon.ts`, `src/core/selectors.ts`
- Test: `src/core/selectors.test.ts`

- [ ] **Step 1: Write the recon script**

```ts
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
      if (el.id.toLowerCase().includes('comment')) out.add(`${tag}#${el.id}`);
      const target = el.getAttribute('target-id');
      if (target?.includes('comment')) out.add(`${tag}[target-id="${target}"]`);
    }
    return [...out].sort();
  });
  console.log(`\n=== width ${width} ===\n${found.join('\n')}`);
  await page.close();
}
await browser.close();
```

- [ ] **Step 2: Run it and keep the output**

Run: `npm run recon`
Expected: two lists, which should include most of `ytd-comments`, `ytd-comments#comments`, `ytd-comment-thread-renderer` (or `ytd-comment-view-model`), `ytd-comments-entry-point-header-renderer`, and `ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]`. Paste the output into the commit message for Step 7.

- [ ] **Step 3: Write the failing test**

Use the jsdom environment so `Element.matches` is available.

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_ID } from './constants';
import { COMMENT_SELECTORS, PLACEHOLDER_ANCHOR } from './selectors';

describe('COMMENT_SELECTORS', () => {
  it('are all valid CSS selectors', () => {
    for (const s of COMMENT_SELECTORS) expect(() => document.querySelector(s)).not.toThrow();
  });

  it('cover the comments section, teaser and side panel', () => {
    document.body.innerHTML = `
      <ytd-comments id="comments"></ytd-comments>
      <ytd-comments-entry-point-header-renderer></ytd-comments-entry-point-header-renderer>
      <div id="comment-teaser"></div>
      <ytd-engagement-panel-section-list-renderer target-id="engagement-panel-comments-section"></ytd-engagement-panel-section-list-renderer>
    `;
    for (const el of document.body.children) {
      expect(COMMENT_SELECTORS.some((s) => el.matches(s))).toBe(true);
    }
  });

  it('never match the Placeholder', () => {
    document.body.innerHTML = `<div id="${PLACEHOLDER_ID}"></div>`;
    const el = document.getElementById(PLACEHOLDER_ID)!;
    for (const s of COMMENT_SELECTORS) expect(el.matches(s)).toBe(false);
  });

  it('anchor the Placeholder to the comments section of the Watch Page', () => {
    document.body.innerHTML = `<ytd-watch-flexy><div id="below"><ytd-comments id="comments"></ytd-comments></div></ytd-watch-flexy>`;
    expect(document.querySelector(PLACEHOLDER_ANCHOR)?.tagName).toBe('YTD-COMMENTS');
  });
});
```

- [ ] **Step 4: Run the test and check it fails**

Run: `npx vitest run src/core/selectors.test.ts`
Expected: FAIL, with a "Failed to resolve import ./selectors" error.

- [ ] **Step 5: Implement**

Start from this list. Then add every element from Step 2's output that shows comment text outside the elements already listed. Overlapping entries are fine: a broad list is how the extension fails closed.

```ts
/**
 * Everything on youtube.com that can show comment text. Hidden unless the
 * ShieldMode is "revealed" or "inactive". Broad on purpose: when YouTube
 * changes its layout we would rather hide too much than leak (ADR 0002).
 * Re-check with: npm run recon
 */
export const COMMENT_SELECTORS: readonly string[] = [
  'ytd-comments',
  'ytd-comments-entry-point-header-renderer',
  'ytd-comments-entry-point-teaser-renderer',
  '#comment-teaser',
  'ytd-comment-thread-renderer',
  'ytd-comment-view-model',
  'ytd-comment-renderer',
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]',
  'ytd-engagement-panel-section-list-renderer[target-id="comment-item-section"]',
];

/** The Placeholder is kept directly before this element. */
export const PLACEHOLDER_ANCHOR = 'ytd-watch-flexy ytd-comments#comments';
```

- [ ] **Step 6: Run the test and check it passes**

Run: `npx vitest run src/core/selectors.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add scripts/recon.ts src/core/selectors.ts src/core/selectors.test.ts
git commit -m "feat: list YouTube's comment elements" -m "<paste npm run recon output here>"
```

---

### Task 5: The stylesheet

**Files:**
- Create: `src/core/hideCss.ts`
- Test: `src/core/hideCss.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { ATTR, PLACEHOLDER_ID } from './constants';
import { buildHideCss } from './hideCss';
import { COMMENT_SELECTORS } from './selectors';

const css = buildHideCss();
const hideRule = css.split('\n').find((line) => line.includes(':is('))!;

describe('buildHideCss', () => {
  it('hides every comment selector unless revealed or inactive (fail closed)', () => {
    expect(hideRule.startsWith(`html:not([${ATTR}="revealed"]):not([${ATTR}="inactive"]) :is(`)).toBe(true);
    for (const s of COMMENT_SELECTORS) expect(hideRule).toContain(s);
    expect(hideRule).toContain('display: none !important');
  });

  it('never hides the Placeholder along with the comments', () => {
    expect(hideRule).not.toContain(PLACEHOLDER_ID);
  });

  it('hides the Placeholder off the Watch Page', () => {
    expect(css).toContain(`html[${ATTR}="inactive"] #${PLACEHOLDER_ID} { display: none !important; }`);
  });

  it("follows YouTube's light and dark theme", () => {
    expect(css).toContain('var(--yt-spec-text-primary');
    expect(css).toContain('var(--yt-spec-badge-chip-background');
  });
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `npx vitest run src/core/hideCss.test.ts`
Expected: FAIL, with a "Failed to resolve import ./hideCss" error.

- [ ] **Step 3: Implement**

```ts
import { ATTR, PLACEHOLDER_ID } from './constants';
import { COMMENT_SELECTORS } from './selectors';

const P = `#${PLACEHOLDER_ID}`;

// Neutral and YouTube-native on purpose: a loud box would itself hint that something happened.
const PLACEHOLDER_CSS = `${P} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 24px 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05));
  color: var(--yt-spec-text-primary, #0f0f0f);
  font-family: "Roboto", "Arial", sans-serif;
  font-size: 14px;
  line-height: 20px;
}
${P} .ss-explainer {
  margin-top: 4px;
  color: var(--yt-spec-text-secondary, #606060);
}
${P} button {
  flex: none;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 18px;
  background: var(--yt-spec-10-percent-layer, rgba(0, 0, 0, 0.1));
  color: inherit;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
${P} button:hover {
  background: var(--yt-spec-touch-response, rgba(0, 0, 0, 0.2));
}`;

/** The stylesheet injected before YouTube draws the page. */
export function buildHideCss(): string {
  const gate = `html:not([${ATTR}="revealed"]):not([${ATTR}="inactive"])`;
  const hide = `${gate} :is(${COMMENT_SELECTORS.join(', ')}) { display: none !important; }`;
  const offWatch = `html[${ATTR}="inactive"] ${P} { display: none !important; }`;
  return [hide, offWatch, PLACEHOLDER_CSS].join('\n\n') + '\n';
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `npx vitest run src/core/hideCss.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/hideCss.ts src/core/hideCss.test.ts
git commit -m "feat: stylesheet that hides comments unless revealed"
```

---

### Task 6: The Placeholder

When comments are Hidden it shows "Comments hidden by Spoiler Shield" with a Show comments button. On first use it adds one line of explanation. After a Reveal it shows a Hide comments button. It never shows a comment count.

**Files:**
- Create: `src/content/placeholder.ts`
- Test: `src/content/placeholder.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACEHOLDER_ID } from '../core/constants';
import { createPlaceholder, renderPlaceholder, TEXT } from './placeholder';

const button = (el: HTMLElement) => el.querySelector('button')!;

describe('Placeholder', () => {
  const onReveal = vi.fn();
  const onHide = vi.fn();
  let el: HTMLElement;

  beforeEach(() => {
    onReveal.mockReset();
    onHide.mockReset();
    el = createPlaceholder(document, { onReveal, onHide });
    document.body.replaceChildren(el);
  });

  it('has the Placeholder id', () => {
    expect(el.id).toBe(PLACEHOLDER_ID);
  });

  it('says comments are hidden and offers to show them', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    expect(el.textContent).toContain(TEXT.hidden);
    expect(button(el).textContent).toBe(TEXT.show);
    expect(el.textContent).not.toContain(TEXT.explainer);
  });

  it('adds the explainer the first time', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: true });
    expect(el.textContent).toContain(TEXT.explainer);
  });

  it('never shows a comment count', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: true });
    expect(el.textContent).not.toMatch(/\d/);
  });

  it('reveals in one click', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    button(el).click();
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onHide).not.toHaveBeenCalled();
  });

  it('offers to hide comments again after a Reveal', () => {
    renderPlaceholder(el, { mode: 'revealed', showExplainer: true });
    expect(el.textContent).toContain(TEXT.revealed);
    expect(el.textContent).not.toContain(TEXT.explainer);
    button(el).click();
    expect(onHide).toHaveBeenCalledOnce();
  });

  it('does not rebuild itself when nothing changed', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    const first = button(el);
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    expect(button(el)).toBe(first);
  });
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `npx vitest run src/content/placeholder.test.ts`
Expected: FAIL, with a "Failed to resolve import ./placeholder" error.

- [ ] **Step 3: Implement**

```ts
import { PLACEHOLDER_ID } from '../core/constants';

export const TEXT = {
  hidden: 'Comments hidden by Spoiler Shield',
  show: 'Show comments',
  revealed: 'Comments shown for this video',
  hide: 'Hide comments',
  explainer: 'Comments are hidden on every video so nothing spoils the result. Show them whenever you like.',
} as const;

export interface PlaceholderView {
  mode: 'hidden' | 'revealed';
  showExplainer: boolean;
}

export interface PlaceholderActions {
  onReveal(): void;
  onHide(): void;
}

export function createPlaceholder(doc: Document, actions: PlaceholderActions): HTMLElement {
  const el = doc.createElement('div');
  el.id = PLACEHOLDER_ID;
  el.addEventListener('click', (event) => {
    const target = (event.target as Element).closest('button[data-action]');
    if (!target) return;
    if (target.getAttribute('data-action') === 'reveal') actions.onReveal();
    else actions.onHide();
  });
  return el;
}

export function renderPlaceholder(el: HTMLElement, view: PlaceholderView): void {
  const showExplainer = view.mode === 'hidden' && view.showExplainer;
  const key = `${view.mode}:${showExplainer}`;
  if (el.dataset.view === key) return;
  el.dataset.view = key;

  const doc = el.ownerDocument;
  const text = doc.createElement('div');
  const line = doc.createElement('div');
  line.textContent = view.mode === 'hidden' ? TEXT.hidden : TEXT.revealed;
  text.append(line);
  if (showExplainer) {
    const explainer = doc.createElement('div');
    explainer.className = 'ss-explainer';
    explainer.textContent = TEXT.explainer;
    text.append(explainer);
  }

  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.action = view.mode === 'hidden' ? 'reveal' : 'hide';
  button.textContent = view.mode === 'hidden' ? TEXT.show : TEXT.hide;

  el.replaceChildren(text, button);
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `npx vitest run src/content/placeholder.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/placeholder.ts src/content/placeholder.test.ts
git commit -m "feat: Placeholder with one-click Reveal and Hide again"
```

---

### Task 7: Keeping the Placeholder in place

YouTube re-renders the page often and can move or replace nodes. `ensurePlaced` is called on every DOM change. It keeps the Placeholder directly before the comments section, and does nothing if it can't find the section. In that case comments stay Hidden by the stylesheet (fail closed).

**Files:**
- Create: `src/content/placement.ts`
- Test: `src/content/placement.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { ensurePlaced } from './placement';

const WATCH = `
  <ytd-watch-flexy>
    <div id="below">
      <div id="description"></div>
      <ytd-comments id="comments"></ytd-comments>
    </div>
  </ytd-watch-flexy>`;

describe('ensurePlaced', () => {
  let placeholder: HTMLElement;

  beforeEach(() => {
    placeholder = document.createElement('div');
    placeholder.id = 'spoiler-shield-placeholder';
  });

  it('puts the Placeholder directly before the comments section', () => {
    document.body.innerHTML = WATCH;
    expect(ensurePlaced(document, placeholder)).toBe(true);
    expect(document.querySelector('ytd-comments')!.previousElementSibling).toBe(placeholder);
  });

  it('does nothing and reports false when there is no comments section', () => {
    document.body.innerHTML = '<ytd-watch-flexy><div id="below"></div></ytd-watch-flexy>';
    expect(ensurePlaced(document, placeholder)).toBe(false);
    expect(placeholder.isConnected).toBe(false);
  });

  it('follows the comments section when YouTube moves it', () => {
    document.body.innerHTML = WATCH;
    ensurePlaced(document, placeholder);
    const comments = document.querySelector('ytd-comments')!;
    document.querySelector('#below')!.prepend(comments);
    ensurePlaced(document, placeholder);
    expect(comments.previousElementSibling).toBe(placeholder);
  });

  it('never inserts a second Placeholder', () => {
    document.body.innerHTML = WATCH;
    ensurePlaced(document, placeholder);
    ensurePlaced(document, placeholder);
    expect(document.querySelectorAll('#spoiler-shield-placeholder')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `npx vitest run src/content/placement.test.ts`
Expected: FAIL, with a "Failed to resolve import ./placement" error.

- [ ] **Step 3: Implement**

```ts
import { PLACEHOLDER_ANCHOR } from '../core/selectors';

/**
 * Keeps the Placeholder directly before the comments section.
 * Returns false when the section can't be found; comments then stay Hidden
 * by the stylesheet with no Reveal (fail closed, ADR 0002).
 */
export function ensurePlaced(doc: Document, placeholder: HTMLElement): boolean {
  const anchor = doc.querySelector(PLACEHOLDER_ANCHOR);
  if (!anchor?.parentElement) return false;
  if (anchor.previousElementSibling !== placeholder) {
    anchor.parentElement.insertBefore(placeholder, anchor);
  }
  return true;
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `npx vitest run src/content/placement.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/placement.ts src/content/placement.test.ts
git commit -m "feat: keep the Placeholder above the comments section"
```

---

### Task 8: Remembering that the explainer was seen

This is the only thing Spoiler Shield stores: one true/false value, kept locally, recording that the first-time explainer has been dismissed. No video IDs or channels are stored (Q6, Q23).

**Files:**
- Create: `src/content/explainer.ts`
- Test: `src/content/explainer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { dismissExplainer, shouldShowExplainer, type KeyValueStore } from './explainer';

function memoryStore(): KeyValueStore & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    async get(key) {
      return key in data ? { [key]: data[key] } : {};
    },
    async set(items) {
      Object.assign(data, items);
    },
  };
}

describe('explainer', () => {
  it('shows the explainer on first use', async () => {
    expect(await shouldShowExplainer(memoryStore())).toBe(true);
  });

  it('stops showing it once dismissed', async () => {
    const store = memoryStore();
    await dismissExplainer(store);
    expect(await shouldShowExplainer(store)).toBe(false);
  });

  it('stores nothing but the dismissed flag', async () => {
    const store = memoryStore();
    await dismissExplainer(store);
    expect(store.data).toEqual({ explainerDismissed: true });
  });
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `npx vitest run src/content/explainer.test.ts`
Expected: FAIL, with a "Failed to resolve import ./explainer" error.

- [ ] **Step 3: Implement**

```ts
const KEY = 'explainerDismissed';

/** The slice of chrome.storage.local we use, so tests can pass an in-memory store. */
export interface KeyValueStore {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export async function shouldShowExplainer(store: KeyValueStore): Promise<boolean> {
  const items = await store.get(KEY);
  return items[KEY] !== true;
}

export async function dismissExplainer(store: KeyValueStore): Promise<void> {
  await store.set({ [KEY]: true });
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `npx vitest run src/content/explainer.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/explainer.ts src/content/explainer.test.ts
git commit -m "feat: remember that the first-time explainer was seen"
```

---

### Task 9: Manifest, icons and build

This task produces a loadable `dist/` folder. Its content script is still an empty stub, so with this build the stylesheet alone hides comments; Task 11 wires in the script.

**Files:**
- Create: `manifest.json`, `icons/icon.svg`, `scripts/icons.ts`, `scripts/build.ts`, `src/content/main.ts` (stub)

- [ ] **Step 1: Create `manifest.json`**

Permissions are minimal for Web Store review. There's no `host_permissions`: the content script declaration is enough. `storage` is only for the explainer flag. The description may say "YouTube", but the name may not (YouTube branding guidelines).

```json
{
  "manifest_version": 3,
  "name": "Spoiler Shield",
  "version": "0.1.0",
  "description": "Hides YouTube comments by default so sports replays and highlights aren't spoiled. Show them for any video in one click.",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "css": ["hide.css"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

- [ ] **Step 2: Create `icons/icon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path d="M64 8 112 26v34c0 32-22 52-48 60-26-8-48-28-48-60V26Z" fill="#1f6feb"/>
  <path d="M40 44h48a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H60L48 92V82h-8a6 6 0 0 1-6-6V50a6 6 0 0 1 6-6Z" fill="#fff"/>
  <path d="M36 96 92 34" stroke="#1f6feb" stroke-width="14" stroke-linecap="round"/>
  <path d="M36 96 92 34" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 3: Create `scripts/icons.ts` and render the PNGs**

```ts
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile('icons/icon.svg');
for (const size of [16, 48, 128]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(`icons/icon-${size}.png`);
}
console.log('icons written');
```

Run: `npm run icons`
Expected: `icons written`, plus `icons/icon-16.png`, `icon-48.png` and `icon-128.png` exist.

- [ ] **Step 4: Create the content-script stub `src/content/main.ts`**

```ts
// Wired up in Task 11. Until then the stylesheet alone keeps comments Hidden.
export {};
```

- [ ] **Step 5: Create `scripts/build.ts`**

The output isn't minified so Web Store reviewers can read it.

```ts
import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { buildHideCss } from '../src/core/hideCss';

const out = 'dist';

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({
  entryPoints: ['src/content/main.ts'],
  outfile: `${out}/content.js`,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  minify: false,
});
await writeFile(`${out}/hide.css`, buildHideCss());
await copyFile('manifest.json', `${out}/manifest.json`);
await cp('icons', `${out}/icons`, { recursive: true, filter: (src) => !src.endsWith('.svg') });
console.log('built dist/');
```

- [ ] **Step 6: Build and inspect**

Run: `npm run build && ls dist dist/icons && head -c 300 dist/hide.css`
Expected: `built dist/`. `dist/` contains `content.js hide.css icons manifest.json`, `dist/icons` contains the three PNGs, and `hide.css` starts with `html:not([data-spoiler-shield="revealed"])`.

- [ ] **Step 7: Typecheck and run the unit tests**

Run: `npm run typecheck && npm test`
Expected: typecheck prints nothing, and Vitest reports 7 files passed, 45 tests.

- [ ] **Step 8: Commit**

```bash
git add manifest.json icons scripts/icons.ts scripts/build.ts src/content/main.ts
git commit -m "build: manifest, icons and dist build"
```

---

### Task 10: No-flash browser test (written before the content script)

This is the product's core promise, so it gets a test before the wiring exists. A monitor runs every animation frame and reports any visible element with comment text whenever comments should be Hidden. It matches every tag containing "COMMENT", not just our selector list, so a new YouTube element we don't yet hide gets caught. Every test fails if anything leaked.

**Files:**
- Create: `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/youtube.ts`, `e2e/no-flash.spec.ts`

- [ ] **Step 1: Create `playwright.config.ts`**

These tests run against live YouTube, so they run one at a time with one retry, and only on demand and before a release (not on every commit).

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
});
```

- [ ] **Step 2: Create `e2e/fixtures.ts`**

```ts
import path from 'node:path';
import { test as base, chromium, expect, type BrowserContext } from '@playwright/test';

export interface Leak {
  tag: string;
  mode: string | null;
  url: string;
  text: string;
}

// Runs in the page before YouTube's scripts. Reports any visible element that
// shows comment text while comments should be Hidden.
const LEAK_MONITOR = `(() => {
  const reported = new WeakSet();
  const tick = () => {
    const mode = document.documentElement.getAttribute('data-spoiler-shield');
    if (mode !== 'revealed' && mode !== 'inactive') {
      for (const el of document.querySelectorAll('*')) {
        if (!el.tagName.includes('COMMENT') && el.id !== 'comment-teaser') continue;
        if (reported.has(el) || el.closest('#spoiler-shield-placeholder')) continue;
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
```

- [ ] **Step 3: Create `e2e/youtube.ts`**

```ts
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
```

- [ ] **Step 4: Write `e2e/no-flash.spec.ts`**

```ts
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
```

- [ ] **Step 5: Run and confirm the expected failure**

Run: `npm run test:e2e -- e2e/no-flash.spec.ts`
Expected: "comment text is never visible…" **passes**, because the stylesheet alone hides comments. "the Placeholder stands in…" **fails**, waiting for `#spoiler-shield-placeholder`. If the first test fails, look at the reported leak's `tag`. Add it to `COMMENT_SELECTORS` (Task 4) and rebuild until it passes. That fix belongs in this task.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/fixtures.ts e2e/youtube.ts e2e/no-flash.spec.ts
git commit -m "test: no-flash browser test against live YouTube"
```

---

### Task 11: Wire up the content script

**Files:**
- Modify: `src/content/main.ts` (replace the stub entirely)

- [ ] **Step 1: Replace `src/content/main.ts`**

```ts
import { ATTR } from '../core/constants';
import { createRevealState } from '../core/state';
import { videoIdFrom } from '../core/url';
import { dismissExplainer, shouldShowExplainer, type KeyValueStore } from './explainer';
import { createPlaceholder, renderPlaceholder } from './placeholder';
import { ensurePlaced } from './placement';

const root = document.documentElement;
const state = createRevealState();
const store: KeyValueStore = {
  get: (key) => chrome.storage.local.get(key),
  set: (items) => chrome.storage.local.set(items),
};
let showExplainer = false;

const placeholder = createPlaceholder(document, {
  onReveal() {
    state.reveal();
    if (showExplainer) {
      showExplainer = false;
      void dismissExplainer(store);
    }
    sync();
  },
  onHide() {
    state.hide();
    sync();
  },
});

/** Pushes the current state into the page. Safe to call as often as you like. */
function sync(): void {
  const mode = state.mode();
  root.setAttribute(ATTR, mode);
  if (mode === 'inactive') return;
  if (ensurePlaced(document, placeholder)) {
    renderPlaceholder(placeholder, { mode: mode === 'revealed' ? 'revealed' : 'hidden', showExplainer });
  }
}

function onLocationChange(): void {
  state.navigatedTo(videoIdFrom(location.href));
  sync();
}

// YouTube is a single-page app: clicks, autoplay and Back don't reload the page.
document.addEventListener('yt-navigate-start', () => {
  state.navigationStarted();
  sync();
});
document.addEventListener('yt-navigate-finish', onLocationChange);
window.addEventListener('popstate', onLocationChange);

// Backstop for missed navigation events, and re-placing the Placeholder after re-renders.
// requestAnimationFrame runs before the next paint, so a changed video is Hidden before it is drawn.
let frameQueued = false;
new MutationObserver(() => {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => {
    frameQueued = false;
    if (videoIdFrom(location.href) !== state.currentVideoId()) onLocationChange();
    else sync();
  });
}).observe(root, { childList: true, subtree: true });

onLocationChange();
void shouldShowExplainer(store).then((show) => {
  showExplainer = show;
  sync();
});
```

- [ ] **Step 2: Typecheck and run the unit tests**

Run: `npm run typecheck && npm test`
Expected: typecheck prints nothing, and all 45 unit tests pass.

- [ ] **Step 3: Run the no-flash tests**

Run: `npm run test:e2e -- e2e/no-flash.spec.ts`
Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add src/content/main.ts
git commit -m "feat: wire Reveal state, Placeholder and YouTube navigation"
```

---

### Task 12: Reveal behaviour in the real browser

**Files:**
- Create: `e2e/reveal.spec.ts`

- [ ] **Step 1: Write `e2e/reveal.spec.ts`**

```ts
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
});

test('a Reveal does not carry over to the next video, or come back on Back', async ({ page }) => {
  await openWatch(page);
  await reveal(page);
  await page.evaluate(() => ((window as unknown as { __ssSamePage: boolean }).__ssSamePage = true));

  const next = page.locator(`#secondary a[href*="/watch?v="]:not([href*="${VIDEO}"])`).first();
  await next.click();
  await page.waitForURL((url) => !url.href.includes(VIDEO));
  // Same document: an in-page navigation, the same path autoplay takes.
  expect(await page.evaluate(() => (window as unknown as { __ssSamePage?: boolean }).__ssSamePage)).toBe(true);
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await scrollThroughPage(page, 4);

  await page.goBack();
  await page.waitForURL(new RegExp(VIDEO));
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await scrollThroughPage(page, 4);
});

test('a Reveal does not survive a refresh', async ({ page }) => {
  await openWatch(page);
  await reveal(page);
  await page.reload();
  await page.locator('ytd-watch-flexy').waitFor();
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'hidden');
  await scrollThroughPage(page, 4);
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
  await scrollThroughPage(page);
  // noLeaks catches any visible teaser or comment.
});

test('pages other than the Watch Page are left alone', async ({ page }) => {
  await page.goto('https://www.youtube.com/');
  await expect(modeOf(page)).toHaveAttribute('data-spoiler-shield', 'inactive');
  await expect(placeholderOf(page)).toHaveCount(0);
});
```

- [ ] **Step 2: Run the whole browser suite**

Run: `npm run test:e2e`
Expected: 8 passed. If the "next video" link click is intercepted by a thumbnail overlay, change `next.click()` to `next.click({ force: true })`. Don't weaken any of the assertions.

- [ ] **Step 3: Commit**

```bash
git add e2e/reveal.spec.ts
git commit -m "test: Reveal, Hide again, navigation, refresh, narrow and off-watch"
```

---

### Task 13: Privacy statement, release checklist, packaging

**Files:**
- Create: `docs/privacy.md`, `docs/release-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Create `docs/privacy.md`**

```markdown
# Spoiler Shield privacy

Spoiler Shield collects no data.

- It makes no network requests and has no analytics or error reporting.
- It stores one setting in your browser (chrome.storage.local): whether you have seen the first-time explanation. It never stores which videos or channels you watch.
- It runs only on www.youtube.com, where it hides comments until you choose to show them.
```

- [ ] **Step 2: Create `docs/release-checklist.md`**

```markdown
# Release checklist

Run before every release, with dist/ loaded unpacked in Chrome (chrome://extensions → Developer mode → Load unpacked).

## Automated
- [ ] npm run typecheck && npm test passes
- [ ] npm run test:e2e passes
- [ ] npm run recon: no new comment elements beyond src/core/selectors.ts

## Manual (watch for even a split second of comment text)
- [ ] Default, theatre and full-screen modes: comments Hidden, Placeholder shown
- [ ] Narrow window (under 1000px): no comment teaser visible
- [ ] Dark theme and light theme: Placeholder looks native and neutral
- [ ] Playlist autoplay into the next video after a Reveal: comments Hidden again
- [ ] A link to a specific comment (&lc=): highlighted comment Hidden
- [ ] A video with comments turned off: nothing odd
- [ ] A former live stream: Live Chat Replay works as normal
- [ ] Home page, search, Shorts and channel pages are unaffected
- [ ] chrome://extensions shows no errors for Spoiler Shield

## Package
- [ ] Bump version in manifest.json (and package.json)
- [ ] npm run package → upload spoiler-shield.zip; privacy answer: "does not collect user data", linking docs/privacy.md
```

- [ ] **Step 3: Add development notes to `README.md`**

Append:

```markdown

## Development

- npm install && npx playwright install chromium
- npm test: unit tests · npm run test:e2e: browser tests against live YouTube
- npm run build → load dist/ unpacked in Chrome
- npm run recon: list YouTube's current comment elements after a layout change
- Releasing: [docs/release-checklist.md](./docs/release-checklist.md) · Privacy: [docs/privacy.md](./docs/privacy.md)
```

- [ ] **Step 4: Package**

Run: `npm run package && unzip -l spoiler-shield.zip`
Expected: the archive lists `manifest.json`, `content.js`, `hide.css` and `icons/icon-16.png`, `icon-48.png` and `icon-128.png` at its root. `spoiler-shield.zip` is already in `.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add docs/privacy.md docs/release-checklist.md README.md
git commit -m "docs: privacy statement, release checklist, dev notes"
```

- [ ] **Step 6: Walk the manual checklist once** with the built extension, and note anything that fails as a follow-up task.
