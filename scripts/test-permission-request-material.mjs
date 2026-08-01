import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(new URL('../src/components/PermissionRequestButton.jsx', import.meta.url), 'utf8');
const componentCss = fs.readFileSync(new URL('../src/components/PermissionRequestButton.css', import.meta.url), 'utf8');
const card = fs.readFileSync(new URL('../src/pages/appsDirectoryComponents.jsx', import.meta.url), 'utf8');
const route = fs.readFileSync(new URL('../src/pages/WebAppsAndroidDrawer.jsx', import.meta.url), 'utf8');
const routeCss = fs.readFileSync(new URL('../src/styles/apps-permission-request-material.css', import.meta.url), 'utf8');

assert.match(component, /createPortal\(dialog, document\.body\)/, 'Dialog must escape clipped launcher cards through a portal.');
assert.match(component, /role="dialog"/);
assert.match(component, /aria-modal="true"/);
assert.match(component, /focusableElements/);
assert.match(component, /event\.key === 'Escape'/);
assert.match(component, /message: note/, 'Teacher reason must be included in the existing permission request payload.');
assert.match(component, /maxLength=\{500\}/);
assert.match(component, /className=\{`\$\{className\} permission-request-trigger is-\$\{state\}`\.trim\(\)\}/);

assert.match(card, /flat-app-window-lock-chip/);
assert.match(card, /compact className="request-access-btn"/);
assert.match(card, /tabIndex=\{locked \? -1 : undefined\}/, 'The inert launch control must leave focus to the permission trigger.');
assert.doesNotMatch(card, /🔒/, 'Launcher permission state must not use a floating emoji lock.');

const materialImport = route.indexOf("apps-permission-request-material.css");
const previousImport = route.indexOf("apps-hero-flat-relief-v4.css");
assert.ok(materialImport > previousImport, 'Permission styles must load after all launcher presentation layers.');
assert.match(routeCss, /\.flat-app-window-card\.is-locked[\s\S]*opacity: 1 !important/);
assert.match(routeCss, /\.flat-app-window-card\.is-locked::after[\s\S]*content: none !important/);
assert.match(routeCss, /\.permission-request-trigger[\s\S]*inset: 0 !important/, 'The entire locked card must be the touch target.');
assert.match(routeCss, /min-height: 25px !important/);
assert.match(routeCss, /html\[data-theme='dark'\]/);
assert.match(routeCss, /prefers-reduced-motion: reduce/);

assert.match(componentCss, /z-index: 2147483000/);
assert.match(componentCss, /min-height: 44px !important/);
assert.match(componentCss, /@media \(max-width: 620px\)/, 'Phone and tablet sheet layout is required.');
assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\)/);

console.log('Permission request Material UI contracts passed.');
