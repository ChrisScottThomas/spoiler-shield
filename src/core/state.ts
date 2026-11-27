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
      // Ignored mid-navigation: we don't yet know which video the Reveal would apply to (fail closed).
      if (navigating || current === null) return;
      revealed = current;
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
