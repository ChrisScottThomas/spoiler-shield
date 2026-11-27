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
