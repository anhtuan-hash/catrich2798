import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/features/world-explorer/WorldExplorer.jsx', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/features/world-explorer/WorldExplorerAdmin.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/features/world-explorer/world-explorer.css', import.meta.url), 'utf8');

// Public stories must expand in the page flow; they must not render modal overlays.
assert.match(home, /data-world-explorer-inline-reader/);
assert.match(home, /id="we-expanded-story"/);
assert.match(home, /className="we-expanded-reader"/);
assert.match(home, /aria-expanded=\{selected\?\.id === featured\.id\}/);
assert.match(home, /selected \? <Reader article=\{selected\}/);
assert.doesNotMatch(home, /className="we-overlay"/);
assert.doesNotMatch(home, /className="we-reader" role="dialog"/);
assert.doesNotMatch(home, /document\.body\.style\.overflow/);
assert.match(home, /we-article-columns/);
assert.match(home, /article\.body_en/);
assert.match(home, /article\.body_vi/);
assert.match(home, /className="we-collapse-button"/);

// Archive selections use the same inline reader, not another modal.
assert.match(home, /data-world-explorer-inline-archive/);
assert.match(home, /setArchive\(false\); setSelected\(item\)/);
assert.doesNotMatch(home, /aria-modal="true"/);

// Admin management is a proper right-side drawer portaled outside home stacking contexts.
assert.match(admin, /import \{ createPortal \} from 'react-dom'/);
assert.match(admin, /return createPortal\(/);
assert.match(admin, /className="we-drawer-backdrop"/);
assert.match(admin, /data-world-explorer-admin-drawer/);
assert.match(admin, /<aside className="we-admin we-admin-drawer"/);
assert.match(admin, /ref=\{closeRef\}/);
assert.match(admin, /event\.key === 'Escape'/);
assert.match(admin, /event\.key !== 'Tab'/);
assert.match(admin, /document\.body\.style\.overflow = 'hidden'/);
assert.doesNotMatch(admin, /className="we-overlay we-admin-overlay"/);

assert.match(css, /\.we-expanded-reader\s*\{/);
assert.match(css, /\.we-article-columns\s*\{/);
assert.match(css, /\.we-drawer-backdrop\s*\{/);
assert.match(css, /\.we-admin\.we-admin-drawer\s*\{/);
assert.match(css, /justify-content:\s*flex-end/);
assert.match(css, /height:\s*100dvh/);
assert.match(css, /@media\(max-width:750px\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);

console.log('PASS: World Explorer inline bilingual reader, inline archive, and admin drawer contracts.');
