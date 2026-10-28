import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { linkifyPublicText } from '../src/utils/linkifyPublicText.js';

const source = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const cases = [
  {
    name: 'Vote URL from published Halloween Showcase description',
    input: '🎃 Vote here: https://qrvote.org/c/halloween-showcase-ry29 🎃 One vote',
    link: 'https://qrvote.org/c/halloween-showcase-ry29',
    linkCount: 1,
  },
  {
    name: 'Bare www links and trailing punctuation',
    input: 'Find us at www.example.com/gallery.',
    link: 'https://www.example.com/gallery',
    linkCount: 1,
  },
  {
    name: 'Two independent links in one description',
    input: 'Vote: https://qrvote.org/c/halloween-showcase-ry29. Results: https://qrvote.org/c/halloween-showcase-ry29/screen',
    link: 'https://qrvote.org/c/halloween-showcase-ry29',
    linkCount: 2,
  },
  {
    name: 'Keep balanced parentheses in a valid URL',
    input: 'Look at https://example.com/(gallery) today',
    link: 'https://example.com/(gallery)',
    linkCount: 1,
  },
  {
    name: 'Never turn Javascript URL or markup into an unsafe link',
    input: '<img src=x onerror=alert(1)> javascript:alert(1)',
    linkCount: 0,
  },
  {
    name: 'Userinfo phishing syntax remains plain text',
    input: 'https://trusted.example@evil.example/gallery',
    linkCount: 0,
  },
];
for (const item of cases) {
  const result = linkifyPublicText(item.input);
  const links = result.filter((part) => part.href);
  assert.equal(links.length, item.linkCount, item.name);
  if (item.link) assert.equal(links[0].href, item.link, item.name + ': expected href');
  assert.equal(result.map((part) => part.text).join(''), item.input, item.name + ': preserve original text');
  console.log('✓ ' + item.name);
}

const home = source('src/components/HomePublishedSlideshow.jsx');
const gallery = source('src/pages/PhotoSlideshow.jsx');
const linkView = source('src/components/SlideshowLinkedText.jsx');
const styles = source('src/components/SlideshowLinkedText.css');
const root = source('src/main.jsx');

assert.ok(home.includes('<SlideshowLinkedText text={selected.description} />'),
  'homepage introduction supports clickable voting URL');
assert.ok(home.includes('<SlideshowLinkedText text={artworkStory') &&
  gallery.includes('<SlideshowLinkedText text={selected && !creating') &&
  gallery.includes('<SlideshowLinkedText text={selected.description ||'),
  'both artwork captions and the full public gallery support clickable links');
assert.ok(home.includes('data-guest-allow="slideshow-viewer"') &&
  root.includes("action.closest('[data-guest-allow]')"),
  'guest visitor can activate slideshow links without bypassing any other guest restrictions');
assert.ok(linkView.includes('target="_blank"') &&
  linkView.includes('rel="noopener noreferrer"') &&
  !linkView.includes('dangerouslySetInnerHTML'),
  'safe new-tab links with no HTML injection or window-opener leakage');
assert.ok(styles.includes('pointer-events:auto!important') &&
  styles.includes(':focus-visible'),
  'links remain pointer-accessible and keyboard focusable');

console.log('BRIAN slideshow clickable public links QA PASS');
