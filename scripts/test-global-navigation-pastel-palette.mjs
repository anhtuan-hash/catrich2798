import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(new URL('../src/components/GlobalCompactNavigation.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/GlobalCompactNavigation.css', import.meta.url), 'utf8');

assert.match(css, /background:\s*var\(--nav-item-bg,\s*transparent\)/);
assert.match(css, /background:\s*var\(--nav-item-hover-bg,\s*var\(--brian-nav-soft\)\)/);
assert.match(css, /background:\s*var\(--nav-item-active-bg,\s*var\(--brian-nav-soft\)\)/);
assert.match(css, /color:\s*var\(--nav-item-text,\s*var\(--brian-nav-muted\)\)/);
assert.match(css, /color:\s*var\(--nav-item-active-text,\s*var\(--brian-nav-ink\)\)/);

function selectorBody(position, name) {
  const match = css.match(new RegExp(`\\.brian-nav__primary\\s*>\\s*button:nth-of-type\\(${position}\\)\\s*\\{([^}]*)\\}`, 's'));
  assert.ok(match, `Missing pastel palette for ${name}`);
  return match[1];
}

function readHex(body, variable) {
  const match = body.match(new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `Missing ${variable}`);
  return match[1].toLowerCase();
}

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

const definitions = [
  [1, 'home'],
  [2, 'apps'],
  [3, 'admin'],
];

const palettes = definitions.map(([position, name]) => {
  const body = selectorBody(position, name);
  const palette = {
    name,
    bg: readHex(body, '--nav-item-bg'),
    hoverBg: readHex(body, '--nav-item-hover-bg'),
    activeBg: readHex(body, '--nav-item-active-bg'),
    text: readHex(body, '--nav-item-text'),
    activeText: readHex(body, '--nav-item-active-text'),
  };

  assert.ok(contrast(palette.text, palette.bg) >= 4.5, `${name} default contrast must be >= 4.5:1`);
  assert.ok(contrast(palette.text, palette.hoverBg) >= 4.5, `${name} hover contrast must be >= 4.5:1`);
  assert.ok(contrast(palette.activeText, palette.activeBg) >= 4.5, `${name} active contrast must be >= 4.5:1`);
  return palette;
});

assert.equal(new Set(palettes.map(({ bg }) => bg)).size, 3, 'Each primary navigation button must have a distinct pastel background');
assert.equal(new Set(palettes.map(({ activeBg }) => activeBg)).size, 3, 'Each primary navigation button must have a distinct active background');

assert.match(css, /\.brian-nav button:focus-visible,\s*\.brian-chatbot-fab:focus-visible\s*\{[^}]*outline:\s*3px solid/s);
assert.match(component, /route === 'home' \? 'is-active' : ''/);
assert.match(component, /route === 'apps' \? 'is-active' : ''/);
assert.match(component, /route === 'admin' \? 'is-active' : ''/);
assert.match(component, /canShowApps \? <button/);
assert.match(component, /isAdmin \? <button/);

console.log('✓ Global navigation uses three distinct accessible pastel palettes without changing route or permission logic.');
