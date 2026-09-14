import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const authPage = fs.readFileSync(path.join(root, 'src/pages/AuthPage.jsx'), 'utf8');
const chromeFixPath = path.join(root, 'src/pages/AuthPageChromeFix.css');

if (!fs.existsSync(chromeFixPath)) {
  throw new Error('AuthPageChromeFix.css is required for the login/register chrome regression fix.');
}

const chromeFix = fs.readFileSync(chromeFixPath, 'utf8');

const googleImport = "import './AuthPageGoogle.css';";
const fixImport = "import './AuthPageChromeFix.css';";
const googleIndex = authPage.indexOf(googleImport);
const fixIndex = authPage.indexOf(fixImport);

if (googleIndex < 0 || fixIndex < 0 || fixIndex < googleIndex) {
  throw new Error('AuthPageChromeFix.css must be imported after AuthPageGoogle.css.');
}

const requirements = [
  ["grid-template-columns: minmax(0, 1fr) auto", 'auth navigation must use a two-column brand/action layout'],
  [".brian-nav__actions", 'auth navigation must neutralize the empty actions column'],
  ["display: none", 'hidden auth-only navigation columns must not reserve grid space'],
  [".auth-google-page-footer", 'auth footer must have an explicit surface rule'],
  ["background: rgba(255, 255, 255", 'auth footer/navigation must restore a white surface'],
  ["border-radius:", 'auth chrome must restore rounded containers'],
  ["box-shadow:", 'auth chrome must restore visual separation from the page background'],
];

for (const [needle, message] of requirements) {
  if (!chromeFix.includes(needle)) throw new Error(`${message}: missing ${needle}`);
}

console.log('Auth chrome balance regression contract: OK');
