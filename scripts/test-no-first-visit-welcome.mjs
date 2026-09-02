import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bootstrapPath = path.join(root, 'src', 'applicationBootstrap.jsx');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');

const forbiddenBootstrapTokens = [
  "./firstVisitWelcome.js",
  'installFirstVisitWelcome',
];

for (const token of forbiddenBootstrapTokens) {
  if (bootstrap.includes(token)) {
    throw new Error(`Welcome screen is still wired into application bootstrap: ${token}`);
  }
}

const retiredFiles = [
  path.join(root, 'src', 'firstVisitWelcome.js'),
  path.join(root, 'src', 'styles', 'FirstVisitWelcomeStarryNight.css'),
];

for (const file of retiredFiles) {
  if (fs.existsSync(file)) {
    throw new Error(`Retired welcome asset still exists: ${path.relative(root, file)}`);
  }
}

console.log('PASS: first-visit welcome screen is retired from global bootstrap.');
