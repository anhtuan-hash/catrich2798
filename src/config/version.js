export const APP_VERSION = '11.3.5';
export const RELEASE_NAME = 'Work Submission Archive to Resource Library';
export const RUNTIME_CORE_VERSION = '2.3.5';
export const SCHEMA_VERSION = '11.3.5';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
