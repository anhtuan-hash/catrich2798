import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROUTE_PERMISSION_IDS,
  createCustomPermissions,
  getFirstAllowedRoute,
  hasRouteAccess,
} from '../src/utils/permissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const qaSource = read('src/pages/QAHealthCheck.jsx');
const homeSource = read('src/pages/HomeApproved.jsx');
const appsSource = read('src/data/apps.js');
const toolPageSource = read('src/pages/ToolPage.jsx');
const workflowSource = read('.github/workflows/critical-e2e.yml');

const forbiddenQaMutations = [
  'addQuestionsFromTextToBank',
  'addHistoryEntry',
  'savePromptEntry',
  'addBankItems',
];
for (const mutation of forbiddenQaMutations) {
  assert.equal(
    qaSource.includes(mutation),
    false,
    `QA Health Check must stay read-only; found mutator ${mutation}`,
  );
}

const noDashboard = {
  role: 'teacher',
  permissions: createCustomPermissions([]),
};
assert.equal(
  hasRouteAccess(noDashboard, 'dashboard'),
  false,
  'Teacher without route:dashboard must not access Dashboard',
);
assert.notEqual(
  getFirstAllowedRoute(noDashboard),
  'dashboard',
  'Dashboard must not be the unconditional first route',
);

const dashboardTeacher = {
  role: 'teacher',
  permissions: createCustomPermissions([ROUTE_PERMISSION_IDS.dashboard]),
};
assert.equal(
  hasRouteAccess(dashboardTeacher, 'dashboard'),
  true,
  'Teacher explicitly granted route:dashboard must access Dashboard',
);
assert.equal(
  getFirstAllowedRoute(dashboardTeacher),
  'dashboard',
  'Dashboard should remain the first landing route when explicitly allowed',
);

assert.match(
  appsSource,
  /slug:\s*['"]lesson-plan-ai['"]/,
  'Lesson Architect must be registered as lesson-plan-ai',
);
assert.match(
  toolPageSource,
  /LessonArchitect/,
  'ToolPage must load the Lesson Architect module',
);
assert.match(
  homeSource,
  /['"]lesson-plan-ai['"]/,
  'Home Lesson Architect card must target the registered lesson-plan-ai tool',
);
assert.equal(
  /['"]game-hub['"]/.test(homeSource),
  false,
  'Retired Game Hub must not be advertised on Home',
);

assert.match(
  workflowSource,
  /push:\s*\n\s+branches:\s*\[main\]/,
  'Critical E2E must run again on pushes to main after merge',
);
assert.match(
  workflowSource,
  /test-audit-regression-hardening\.mjs/,
  'Critical E2E must execute the audit regression contract',
);

console.log('Audit regression hardening contract passed.');
