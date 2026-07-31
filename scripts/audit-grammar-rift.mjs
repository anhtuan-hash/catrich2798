import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const register = read('src/data/registerGrammarRift.js');
const toolPage = read('src/pages/ToolPage.jsx');
const game = read('src/pages/GrammarRiftGame.jsx');
const baseCss = read('src/styles/GrammarRiftGame.css');
const enhancementCss = read('src/styles/GrammarRiftGameEnhancements.css');
const version = read('src/config/version.js');

expect(register.includes("slug: 'grammar-rift'"), 'Grammar Rift app slug is missing.');
expect(register.includes('featured: true'), 'Grammar Rift must remain featured in the app catalog.');
expect(toolPage.includes("import('../pages/GrammarRiftGame.jsx')") || toolPage.includes("import('./GrammarRiftGame.jsx')"), 'Grammar Rift lazy import is missing from ToolPage.');
expect(toolPage.includes("tool?.slug === 'grammar-rift'"), 'Grammar Rift route is missing from ToolPage.');
expect(version.includes("registerGrammarRift.js"), 'Grammar Rift startup registration is missing.');

for (const mode of ['timeline', 'surgery', 'intruder', 'fusion', 'storm']) {
  expect(game.includes(`id: '${mode}'`), `Game mode '${mode}' is missing.`);
}
expect(game.includes('cleanBank'), 'Question-bank validation is missing.');
expect(game.includes('intruderIndexes'), 'Position-safe intruder grading is missing.');
expect(game.includes("visibilitychange"), 'Timer visibility protection is missing.');
expect(game.includes("event.code === 'Space'"), 'Classroom keyboard controls are missing.');
expect(game.includes('modalOpen'), 'Modal timer pause protection is missing.');
expect(game.includes('GrammarRiftGameEnhancements.css'), 'Enhancement stylesheet import is missing.');
expect(baseCss.includes('.gr-app'), 'Base Grammar Rift stylesheet is missing.');
expect(enhancementCss.includes('.gr-pause-overlay'), 'Pause overlay styles are missing.');
expect(!game.match(/openrouter|gemini|api[_-]?key/i), 'Grammar Rift must remain offline and API-independent.');

if (failures.length) {
  console.error('\nGrammar Rift audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Grammar Rift audit passed.');
