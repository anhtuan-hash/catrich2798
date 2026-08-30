import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const navigation = read('src/components/GlobalFlatNavigation.jsx');
const appMigration = read('src/styles/BrianStage5Migration.css');
const workflowMigration = read('src/styles/BrianStage5WorkflowMigration.css');
const main = read('src/main.jsx');

const failures = [];
const requireText = (source, value, label) => {
  if (!source.includes(value)) failures.push(`${label}: missing ${value}`);
};

requireText(navigation, "../styles/BrianStage5Migration.css", 'global navigation');
requireText(navigation, "../styles/BrianStage5WorkflowMigration.css", 'global navigation');

for (const route of ["data-route='home'", "data-route='dashboard'"]) {
  requireText(appMigration, route, 'app migration CSS');
}
requireText(workflowMigration, '.ttcm-m3-shell', 'workflow migration CSS');
requireText(workflowMigration, "data-route='homeroom'", 'workflow migration CSS');

for (const token of [
  '--brian-surface-canvas',
  '--brian-surface-primary',
  '--brian-border-default',
  '--brian-accent',
  '--brian-focus-color',
]) {
  if (!appMigration.includes(token) && !workflowMigration.includes(token)) {
    failures.push(`migration CSS: semantic token not used: ${token}`);
  }
}

if (/currentRoute === 'practice'\s*&&/.test(main)) {
  failures.push('legacy practice route is rendered again; re-audit Stage 5 practice migration target');
}

if (failures.length) {
  console.error('Stage 5 design-system audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Stage 5 design-system audit passed.');
console.log('Migrated surfaces: Home, Dashboard, TTCM workspace, Homeroom workspace.');
console.log('Legacy practice route remains non-rendered; active practice tools must migrate by tool slug.');
