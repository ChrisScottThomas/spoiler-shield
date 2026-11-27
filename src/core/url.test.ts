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
