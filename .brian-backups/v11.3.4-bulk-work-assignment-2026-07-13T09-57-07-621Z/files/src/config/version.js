export const APP_VERSION = '11.3.3';
export const RELEASE_NAME = 'Work Assignment Delivery';
export const RUNTIME_CORE_VERSION = '2.3.3';
export const SCHEMA_VERSION = '11.3.3';

export function getVersionInfo() {
  return { application: APP_VERSION, release: RELEASE_NAME, runtime: RUNTIME_CORE_VERSION, schema: SCHEMA_VERSION };
}
