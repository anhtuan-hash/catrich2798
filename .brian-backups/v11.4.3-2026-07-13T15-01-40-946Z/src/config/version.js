export const APP_VERSION = '11.4.2';
export const RELEASE_NAME = 'AI Lesson Integration Native Merge';
export const RUNTIME_CORE_VERSION = '2.4.2';
export const SCHEMA_VERSION = '11.4.2';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
