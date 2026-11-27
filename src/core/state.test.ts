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
