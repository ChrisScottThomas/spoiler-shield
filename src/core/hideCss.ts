import { ATTR, PLACEHOLDER_ID } from './constants';
import { COMMENT_SELECTORS } from './selectors';

const P = `#${PLACEHOLDER_ID}`;

// Neutral and YouTube-native on purpose: a loud box would itself hint that something happened.
// Colours are our own, keyed off the "dark" attribute YouTube sets on <html>: YouTube no longer
// exposes its --yt-spec-* theme variables to the page, so they can't be relied on.
const PLACEHOLDER_CSS = `${P} {
  --ss-surface: rgba(0, 0, 0, 0.05);
  --ss-text: #0f0f0f;
  --ss-text-secondary: #606060;
  --ss-button: rgba(0, 0, 0, 0.1);
  --ss-button-hover: rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 24px 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--ss-surface);
  color: var(--ss-text);
  font-family: "Roboto", "Arial", sans-serif;
  font-size: 14px;
  line-height: 20px;
}
html[dark] ${P} {
  --ss-surface: rgba(255, 255, 255, 0.08);
  --ss-text: #f1f1f1;
  --ss-text-secondary: #aaaaaa;
  --ss-button: rgba(255, 255, 255, 0.16);
  --ss-button-hover: rgba(255, 255, 255, 0.26);
}
${P} .ss-explainer {
  margin-top: 4px;
  color: var(--ss-text-secondary);
}
${P} button {
  flex: none;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 18px;
  background: var(--ss-button);
  color: var(--ss-text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
${P} button:hover {
  background: var(--ss-button-hover);
}`;

/** The stylesheet injected before YouTube draws the page. */
export function buildHideCss(): string {
  const gate = `html:not([${ATTR}="revealed"]):not([${ATTR}="inactive"])`;
  const hide = `${gate} :is(${COMMENT_SELECTORS.join(', ')}) { display: none !important; }`;
  const offWatch = `html[${ATTR}="inactive"] ${P} { display: none !important; }`;
  return [hide, offWatch, PLACEHOLDER_CSS].join('\n\n') + '\n';
}
