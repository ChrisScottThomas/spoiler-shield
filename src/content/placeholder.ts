import { PLACEHOLDER_ID } from '../core/constants';

export const TEXT = {
  hidden: 'Comments hidden by Spoiler Shield',
  show: 'Show comments',
  revealed: 'Comments shown for this video',
  hide: 'Hide comments',
  explainer: 'Comments are hidden on every video so nothing spoils the result. Show them whenever you like.',
} as const;

export interface PlaceholderView {
  mode: 'hidden' | 'revealed';
  showExplainer: boolean;
}

export interface PlaceholderActions {
  onReveal(): void;
  onHide(): void;
}

export function createPlaceholder(doc: Document, actions: PlaceholderActions): HTMLElement {
  const el = doc.createElement('div');
  el.id = PLACEHOLDER_ID;
  el.addEventListener('click', (event) => {
    const target = (event.target as Element).closest('button[data-action]');
    if (!target) return;
    if (target.getAttribute('data-action') === 'reveal') actions.onReveal();
    else actions.onHide();
  });
  return el;
}

export function renderPlaceholder(el: HTMLElement, view: PlaceholderView): void {
  const showExplainer = view.mode === 'hidden' && view.showExplainer;
  const key = `${view.mode}:${showExplainer}`;
  if (el.dataset.view === key) return;
  el.dataset.view = key;

  const doc = el.ownerDocument;
  const text = doc.createElement('div');
  const line = doc.createElement('div');
  line.textContent = view.mode === 'hidden' ? TEXT.hidden : TEXT.revealed;
  text.append(line);
  if (showExplainer) {
    const explainer = doc.createElement('div');
    explainer.className = 'ss-explainer';
    explainer.textContent = TEXT.explainer;
    text.append(explainer);
  }

  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.action = view.mode === 'hidden' ? 'reveal' : 'hide';
  button.textContent = view.mode === 'hidden' ? TEXT.show : TEXT.hide;

  el.replaceChildren(text, button);
}
