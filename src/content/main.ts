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
let explainerDismissed = false;

const placeholder = createPlaceholder(document, {
  onReveal() {
    state.reveal();
    if (!explainerDismissed) {
      explainerDismissed = true;
      showExplainer = false;
      void dismissExplainer(store).catch(() => {});
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
void shouldShowExplainer(store)
  .then((show) => {
    showExplainer = show && !explainerDismissed;
    sync();
  })
  .catch(() => {});
