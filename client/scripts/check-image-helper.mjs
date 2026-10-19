// Run without Vitest, a browser, network calls, or the application database:
// node client/scripts/check-image-helper.mjs [helper source] [client dependency root]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const helperPath = resolve(process.argv[2] ?? resolve(import.meta.dirname, '../src/utils/imageHelper.ts'));
const dependencyRoot = resolve(process.argv[3] ?? resolve(import.meta.dirname, '..'));
const require = createRequire(resolve(dependencyRoot, 'package.json'));
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync(helperPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { getOptimizedVehicleImageUrl: optimize, getVehicleImageProps: props } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`
);

const base = 'https://res.cloudinary.com/demo/image/upload/v123/bikes/blue.png';
assert.equal(optimize(base), 'https://res.cloudinary.com/demo/image/upload/f_webp,q_auto,c_limit,w_960/v123/bikes/blue.png');
assert.equal(optimize(base, 640), 'https://res.cloudinary.com/demo/image/upload/f_webp,q_auto,c_limit,w_640/v123/bikes/blue.png');
assert.equal(optimize(optimize(base, 640), 480), optimize(base, 480));

const effects = 'https://res.cloudinary.com/demo/image/upload/e_trim/f_auto,q_auto/v123/bikes/blue.png';
assert.equal(optimize(effects, 640), 'https://res.cloudinary.com/demo/image/upload/e_trim/f_auto,q_auto/f_webp,q_auto,c_limit,w_640/v123/bikes/blue.png');
assert.equal(optimize(optimize(effects, 640), 640), optimize(effects, 640));
assert.equal(optimize('https://res.cloudinary.com/demo/image/upload/bikes/blue.png', 480), 'https://res.cloudinary.com/demo/image/upload/f_webp,q_auto,c_limit,w_480/bikes/blue.png');
assert.equal(new URL(optimize(`${base}?foo=bar#preview`, 480)).search, '?foo=bar');
assert.equal(new URL(optimize(`${base}?foo=bar#preview`, 480)).hash, '#preview');
assert.ok(optimize(base, 99999).includes('w_1920/'));
assert.ok(optimize(base, -2).includes('w_1/'));
assert.ok(optimize(base, Number.NaN).includes('w_960/'));

const signed = 'https://res.cloudinary.com/demo/image/upload/s--abc_123--/v123/bikes/blue.png';
assert.equal(optimize(signed), signed);
assert.equal(props(signed).srcSet, undefined);
for (const external of [
  'https://images.example.com/blue.jpg?original=1',
  'https://res.cloudinary.com.evil.example/image/upload/blue.png',
  'https://images.example.com/?next=cloudinary.com/image/upload/blue.png',
  '/uploads/bikes/blue.png',
]) {
  assert.equal(optimize(external), external);
  assert.equal(props(external).srcSet, undefined);
}
for (const invalid of [undefined, '', 'javascript:alert(1)', 'data:text/html,unsafe', '//evil.example/image.jpg', 'https://user:password@example.com/image.jpg', 'https:\\evil.example\\image.jpg']) {
  assert.equal(optimize(invalid), '');
}

const lazy = props(base, { width: 640, widths: [640, 320, 640, Number.NaN, 99999, -1] });
assert.equal(lazy.loading, 'lazy');
assert.equal(lazy.decoding, 'async');
assert.equal(lazy.fetchpriority, 'auto');
assert.deepEqual(lazy.srcSet.split(', ').map((entry) => entry.split(' ').at(-1)), ['320w', '640w', '1920w']);
const hero = props(base, { width: 1280, priority: true, sizes: '100vw' });
assert.equal(hero.loading, 'eager');
assert.equal(hero.fetchpriority, 'high');
assert.equal(hero.sizes, '100vw');
assert.equal(props(base, { widths: [] }).srcSet, undefined);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const warnings = [];
const previousConsoleError = console.error;
let markup;
try {
  console.error = (...values) => warnings.push(values.join(' '));
  markup = renderToStaticMarkup(React.createElement('img', { ...hero, alt: 'Vehicle image test' }));
} finally { console.error = previousConsoleError; }
assert.deepEqual(warnings, [], 'Optimized image props must be compatible with the installed React version.');
assert.ok(markup.includes('fetchpriority="high"'));
console.log('Vehicle image helper checks passed (CDN URLs, idempotence, widths, responsive props, signed/external fallbacks).');
