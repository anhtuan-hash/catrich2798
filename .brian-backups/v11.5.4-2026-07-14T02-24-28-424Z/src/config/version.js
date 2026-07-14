export const APP_VERSION = '11.5.3';
export const RELEASE_NAME = 'Pronunciation Coach Speech Practice Workbench';
export const RUNTIME_CORE_VERSION = '2.5.3';
export const SCHEMA_VERSION = '11.4.2';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
