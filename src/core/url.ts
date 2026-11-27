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
