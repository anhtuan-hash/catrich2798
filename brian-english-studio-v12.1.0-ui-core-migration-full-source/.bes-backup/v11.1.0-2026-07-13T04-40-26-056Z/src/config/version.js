export const APP_VERSION = '11.0.0';
export const RELEASE_NAME = 'Connected Teaching Suite';
export const RUNTIME_CORE_VERSION = '2.0.0';
export const SCHEMA_VERSION = '11.0.0';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
