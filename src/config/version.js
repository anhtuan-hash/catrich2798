export const APP_VERSION = '11.3.4';
export const RELEASE_NAME = 'Bulk Work Assignment & Safe Delete';
export const RUNTIME_CORE_VERSION = '2.3.4';
export const SCHEMA_VERSION = '11.3.4';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
