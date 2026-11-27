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
