import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../storefront_temp');

describe('temporary storefront scripts', () => {
  for (const file of ['index.html', 'cart.html', 'checkout.html', 'track.html']) {
    it(`${file} inline JavaScript parses`, () => {
      const html = readFileSync(resolve(root, file), 'utf8');
      const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
      expect(scripts.length).toBeGreaterThan(0);
      scripts.forEach((match, index) => {
        expect(() => new Script(match[1], { filename: `${file} inline script ${index + 1}` })).not.toThrow();
      });
    });
  }
});
