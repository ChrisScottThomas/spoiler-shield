const KEY = 'explainerDismissed';

/** The slice of chrome.storage.local we use, so tests can pass an in-memory store. */
export interface KeyValueStore {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export async function shouldShowExplainer(store: KeyValueStore): Promise<boolean> {
  const items = await store.get(KEY);
  return items[KEY] !== true;
}

export async function dismissExplainer(store: KeyValueStore): Promise<void> {
  await store.set({ [KEY]: true });
}
