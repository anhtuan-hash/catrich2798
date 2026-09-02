import fs from 'node:fs';
import path from 'node:path';

const guardFile = path.join(process.cwd(), 'src/components/GlobalRuntimeGuard.jsx');
const source = fs.readFileSync(guardFile, 'utf8');
const failures = [];

if (!/const\s+showHeroThemeStudio\s*=\s*route\s*===\s*['"]admin['"]\s*\|\|\s*route\s*===\s*['"]settings['"]/.test(source)) {
  failures.push('Hero Theme Studio must be enabled for both #/admin and #/settings');
}

if (!/\{showHeroThemeStudio\s*\?\s*<HeroThemeStudioBridge\s+language=\{language\}\s*\/>\s*:\s*null\}/.test(source)) {
  failures.push('HeroThemeStudioBridge must render from the dedicated showHeroThemeStudio route gate');
}

if (failures.length) {
  console.error(`Hero Theme Studio settings-route regression FAILED (${failures.length})`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log('Hero Theme Studio settings-route regression passed.');
