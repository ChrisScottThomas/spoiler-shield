import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'));

describe('manifest.json', () => {
  it('injects the stylesheet at document_start on www.youtube.com only', () => {
    const [script] = manifest.content_scripts;
    expect(script.css).toEqual(['hide.css']);
    expect(script.run_at).toBe('document_start');
    expect(script.matches).toEqual(['https://www.youtube.com/*']);
  });

  it('asks only for storage, with no host permissions', () => {
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest).not.toHaveProperty('host_permissions');
  });

  it('does not use YouTube in its name', () => {
    expect(manifest.name).not.toMatch(/YouTube|YT/);
  });
});
