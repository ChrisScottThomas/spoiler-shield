// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACEHOLDER_ID } from '../core/constants';
import { createPlaceholder, renderPlaceholder, TEXT } from './placeholder';

const button = (el: HTMLElement) => el.querySelector('button')!;

describe('Placeholder', () => {
  const onReveal = vi.fn();
  const onHide = vi.fn();
  let el: HTMLElement;

  beforeEach(() => {
    onReveal.mockReset();
    onHide.mockReset();
    el = createPlaceholder(document, { onReveal, onHide });
    document.body.replaceChildren(el);
  });

  it('has the Placeholder id', () => {
    expect(el.id).toBe(PLACEHOLDER_ID);
  });

  it('says comments are hidden and offers to show them', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    expect(el.textContent).toContain(TEXT.hidden);
    expect(button(el).textContent).toBe(TEXT.show);
    expect(el.textContent).not.toContain(TEXT.explainer);
  });

  it('adds the explainer the first time', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: true });
    expect(el.textContent).toContain(TEXT.explainer);
  });

  it('never shows a comment count', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: true });
    expect(el.textContent).not.toMatch(/\d/);
  });

  it('reveals in one click', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    button(el).click();
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onHide).not.toHaveBeenCalled();
  });

  it('offers to hide comments again after a Reveal', () => {
    renderPlaceholder(el, { mode: 'revealed', showExplainer: true });
    expect(el.textContent).toContain(TEXT.revealed);
    expect(el.textContent).not.toContain(TEXT.explainer);
    button(el).click();
    expect(onHide).toHaveBeenCalledOnce();
  });

  it('does not rebuild itself when nothing changed', () => {
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    const first = button(el);
    renderPlaceholder(el, { mode: 'hidden', showExplainer: false });
    expect(button(el)).toBe(first);
  });
});
