import fs from 'node:fs';

const target = 'src/components/HomeHeroCmsEditor.jsx';
if (!fs.existsSync(target)) throw new Error(`Missing Hero editor source: ${target}`);

let source = fs.readFileSync(target, 'utf8');
const optimizerImport = "import { uploadHomeHeroMedia } from '../utils/homepageHeroMediaOptimizer.js';";

if (!source.includes(optimizerImport)) {
  const oldFragment = "  uploadHomeHeroMedia,\n} from '../utils/homepageHeroCms.js';";
  const replacement = "} from '../utils/homepageHeroCms.js';\nimport { uploadHomeHeroMedia } from '../utils/homepageHeroMediaOptimizer.js';";
  if (!source.includes(oldFragment)) throw new Error('Could not locate Hero media upload import.');
  source = source.replace(oldFragment, replacement);
}

if (!source.includes(optimizerImport)) throw new Error('Hero media optimizer patch did not complete.');
fs.writeFileSync(target, source);
console.log('Hero editor now optimizes static images and uses immutable Storage caching.');
