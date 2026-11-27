import { PLACEHOLDER_ANCHOR } from '../core/selectors';

/**
 * Keeps the Placeholder directly before the comments section.
 * Returns false when the section can't be found; comments then stay Hidden
 * by the stylesheet with no Reveal (fail closed, ADR 0002).
 */
export function ensurePlaced(doc: Document, placeholder: HTMLElement): boolean {
  const anchor = doc.querySelector(PLACEHOLDER_ANCHOR);
  if (!anchor?.parentElement) return false;
  if (anchor.previousElementSibling !== placeholder) {
    anchor.parentElement.insertBefore(placeholder, anchor);
  }
  return true;
}
