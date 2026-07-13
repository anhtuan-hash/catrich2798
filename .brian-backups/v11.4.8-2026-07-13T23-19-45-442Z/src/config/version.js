export const APP_VERSION = '11.4.7';
export const RELEASE_NAME = 'Grammar Production Workflow V2';
export const RUNTIME_CORE_VERSION = '2.4.7';
export const SCHEMA_VERSION = '11.4.2';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
