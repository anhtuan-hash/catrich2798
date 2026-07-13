export const APP_VERSION = '11.4.5';
export const RELEASE_NAME = 'Lesson Workspace UX + AI Copilot';
export const RUNTIME_CORE_VERSION = '2.4.5';
export const SCHEMA_VERSION = '11.4.2';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
