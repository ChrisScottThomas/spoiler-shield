/**
 * Everything on youtube.com that can show comment text. Hidden unless the
 * ShieldMode is "revealed" or "inactive". Broad on purpose: when YouTube
 * changes its layout we would rather hide too much than leak (ADR 0002).
 * Re-check with: npm run recon
 */
export const COMMENT_SELECTORS: readonly string[] = [
  'ytd-comments',
  'ytd-comments-entry-point-header-renderer',
  'ytd-comments-entry-point-teaser-renderer',
  '#comment-teaser',
  'ytd-comment-thread-renderer',
  'ytd-comment-view-model',
  'ytd-comment-renderer',
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]',
  'ytd-engagement-panel-section-list-renderer[target-id="comment-item-section"]',
  // A comments item section that sits in #below, outside ytd-comments.
  'ytd-item-section-renderer#comments-leave-behind',
];

/** The Placeholder is kept directly before this element. */
export const PLACEHOLDER_ANCHOR = 'ytd-watch-flexy ytd-comments#comments';
