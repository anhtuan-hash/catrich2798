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

const vercelConfigPath = path.join(root, 'vercel.json');
const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
const buildCommand = String(vercelConfig.buildCommand || '');
const forbiddenBuildTokens = [
  'test-welcome-scene-alignment.mjs',
  'firstVisitWelcome',
  'FirstVisitWelcome',
];

for (const token of forbiddenBuildTokens) {
  if (buildCommand.includes(token)) {
    throw new Error(`Vercel build still requires retired welcome code: ${token}`);
  }
}

const editorialContractPath = path.join(root, 'scripts', 'test-editorial-app-heroes.mjs');
const editorialContract = fs.readFileSync(editorialContractPath, 'utf8');
const forbiddenEditorialTokens = [
  'firstVisitWelcome',
  'First-visit welcome',
  'Welcome preview query',
  'Welcome full-motion query',
  'Welcome renders inside a sandboxed iframe',
];

for (const token of forbiddenEditorialTokens) {
  if (editorialContract.includes(token)) {
    throw new Error(`Editorial hero contract still asserts retired welcome behavior: ${token}`);
  }
}

console.log('PASS: first-visit welcome screen is retired from global bootstrap, Vercel build, and editorial contracts.');
