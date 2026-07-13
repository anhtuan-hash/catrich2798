export const APP_VERSION = '11.3.7';
export const RELEASE_NAME = 'Animated Home App Constellation';
export const RUNTIME_CORE_VERSION = '2.3.7';
export const SCHEMA_VERSION = '11.3.5';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
