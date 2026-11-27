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

  it("follows YouTube's dark theme with its own colours", () => {
    expect(css).toContain(`html[dark] #${PLACEHOLDER_ID} {`);
    expect(css).toContain('--ss-text: #f1f1f1;');
    // YouTube no longer exposes its --yt-spec-* variables, so the Placeholder must not depend on them.
    expect(css).not.toContain('--yt-spec-');
  });
});
