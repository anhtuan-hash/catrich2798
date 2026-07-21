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
  const requiredLabels = ['Tổng quan', 'Lịch & hoạt động', 'Hồ sơ & văn bản', 'Trung tâm công việc', 'Kho học liệu'];
  for (const role of roles) {
    globalThis.localStorage = makeStorage();
    globalThis.sessionStorage = makeStorage();
    const html = renderToString(React.createElement(DepartmentWorkspace, {
      language: 'vi',
      currentUser: { id: role, name: role, email: `${role}@test.local`, role },
    }));
    if (!html.includes('department-fluent-workspace')) {
      throw new Error(`Brian Fluent Workspace failed to render for ${role}`);
    }
    for (const label of requiredLabels) {
      if (!html.includes(label)) throw new Error(`Missing department navigation "${label}" for ${role}`);
    }
    if (html.includes('department-v40-hero-shell') || html.includes('department-v2-tabs') || html.includes('v1093-work-hub')) {
      throw new Error(`Legacy Department UI leaked into Brian Fluent Workspace for ${role}`);
    }
    if (html.includes('Báo cáo & thống kê') || html.includes('AI TTCM') || html.includes('Hỗ trợ TTCM') || html.includes('Tạo báo cáo AI')) {
      throw new Error(`Removed content leaked into the department workspace for ${role}`);
    }
    console.log(`✓ department fluent runtime ${role} - ${html.length} chars, four modules, no legacy UI, no AI`);
  }
} finally {
  await server.close();
}
