import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const vercel = JSON.parse(read('vercel.json'));
const openapi = JSON.parse(read('public/brian-question-bank-openapi.json'));
const handler = read('serverless-handlers/_question-bank.js');
const page = read('src/pages/QuestionBank.jsx');
const handlerSource = read('serverless-handlers/_question-bank.js');
const streamlinedCleanup = read('scripts/prepare-streamlined-catalog-v3.mjs');

const routes = new Map((vercel.rewrites || []).map((item) => [item.source, item.destination]));
const expectedRoutes = {
  '/api/question-bank/save-exam': '/api/gateway?handler=question-bank&action=save_exam',
  '/api/question-bank/save-questions': '/api/gateway?handler=question-bank&action=save_questions',
  '/api/question-bank/search-questions': '/api/gateway?handler=question-bank&action=search_questions',
  '/api/question-bank/get-exam': '/api/gateway?handler=question-bank&action=get_exam',
};
for (const [source, destination] of Object.entries(expectedRoutes)) {
  assert.equal(routes.get(source), destination, `Missing or invalid rewrite for ${source}`);
}

const operationIds = Object.values(openapi.paths || {}).flatMap((entry) =>
  Object.values(entry || {}).map((operation) => operation?.operationId).filter(Boolean)
);
for (const operationId of ['saveBrianExam', 'saveBrianQuestions', 'searchBrianQuestions', 'getBrianExam']) {
  assert.ok(operationIds.includes(operationId), `Missing OpenAPI operationId ${operationId}`);
}

assert.equal(openapi.components?.securitySchemes?.BrianQuestionBankKey?.scheme, 'bearer');
assert.ok(handler.includes("payload.action || req.query?.action"), 'Question Bank gateway must accept dedicated route action query.');
assert.ok(page.includes('Kiểm tra kết nối'), 'Question Bank setup wizard must expose a connection test.');
assert.ok(page.includes('Instructions cho GPT'), 'Question Bank setup wizard must provide copyable GPT instructions.');
assert.ok(page.includes('saveBrianExam') && page.includes('searchBrianQuestions'), 'Question Bank UI must name the dedicated ChatGPT actions.');
assert.ok(handlerSource.includes("function legacyVisibilityValue"), 'Question Bank handler must normalize visibility for legacy assessment tables.');
assert.ok(handlerSource.includes("return visibility === 'department' ? 'department' : 'personal';"), 'Legacy assessment visibility must map private/unknown to personal.');
assert.ok(handlerSource.includes("function itemStatusValue"), 'Question Bank handler must normalize assessment item statuses.');
assert.ok(handlerSource.includes("function testStatusValue"), 'Question Bank handler must normalize assessment test statuses.');
assert.ok(!/assessment_items[\s\S]{0,1200}visibility:\s*'private'/.test(page), 'Question Bank UI must not write private visibility directly into assessment_items.');
assert.ok(!streamlinedCleanup.includes("'assessment-core'"), 'assessment-core must never be retired by the streamlined catalog build cleanup.');
assert.ok(!page.includes("localStorage.setItem") || !page.includes('generatedKey'), 'Raw Brian connector key must not be intentionally persisted to localStorage.');

console.log('PASS: Brian Question Bank ChatGPT action contract is intact.');
