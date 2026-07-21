import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

function makeStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => Array.from(store.keys())[index] || null,
    get length() { return store.size; },
  };
}

globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();
globalThis.window = {
  clearTimeout,
  setTimeout,
  setInterval,
  clearInterval,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  confirm() { return true; },
  location: { hash: '#/department' },
  navigator: { clipboard: null },
};
globalThis.document = { querySelector() { return null; } };
globalThis.navigator = globalThis.window.navigator;
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { default: DepartmentWorkspace } = await server.ssrLoadModule('/src/pages/DepartmentWorkspace.jsx');
  const roles = ['admin', 'ttcm', 'teacher'];
  const requiredLabels = ['Tổng quan', 'Lịch & hoạt động', 'Hồ sơ & văn bản', 'Trung tâm công việc'];
  for (const role of roles) {
    globalThis.localStorage = makeStorage();
    globalThis.sessionStorage = makeStorage();
    const html = renderToString(React.createElement(DepartmentWorkspace, {
      language: 'vi',
      currentUser: { id: role, name: role, email: `${role}@test.local`, role },
      hasApiKey: true,
    }));
    if (!html.includes('department-v40-hero-shell')) {
      throw new Error(`Department workspace failed to render for ${role}`);
    }
    for (const label of requiredLabels) {
      if (!html.includes(label)) throw new Error(`Missing department module "${label}" for ${role}`);
    }
    if (html.includes('Báo cáo & thống kê')) {
      throw new Error(`Removed reports module leaked into the department workspace for ${role}`);
    }
    if (html.includes('AI TTCM') || html.includes('Hỗ trợ TTCM') || html.includes('Tạo báo cáo AI')) {
      throw new Error(`AI content leaked into the department workspace for ${role}`);
    }
    console.log(`✓ department runtime ${role} - ${html.length} chars, four modules, no reports tab, no AI`);
  }
} finally {
  await server.close();
}
