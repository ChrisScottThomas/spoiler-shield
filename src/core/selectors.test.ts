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
