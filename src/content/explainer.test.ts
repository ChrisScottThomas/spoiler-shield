import { describe, expect, it } from 'vitest';
import { dismissExplainer, shouldShowExplainer, type KeyValueStore } from './explainer';

function memoryStore(): KeyValueStore & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    async get(key) {
      return key in data ? { [key]: data[key] } : {};
    },
    async set(items) {
      Object.assign(data, items);
    },
  };
}

describe('explainer', () => {
  it('shows the explainer on first use', async () => {
    expect(await shouldShowExplainer(memoryStore())).toBe(true);
  });

  it('stops showing it once dismissed', async () => {
    const store = memoryStore();
    await dismissExplainer(store);
    expect(await shouldShowExplainer(store)).toBe(false);
  });

  it('stores nothing but the dismissed flag', async () => {
    const store = memoryStore();
    await dismissExplainer(store);
    expect(store.data).toEqual({ explainerDismissed: true });
  });
});
