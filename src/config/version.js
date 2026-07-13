export const APP_VERSION = '10.99.0';
export const RELEASE_NAME = 'Production Hardening & Core Cleanup';
export const RUNTIME_CORE_VERSION = '1.6.0';
export const SCHEMA_VERSION = '10.99.0';

export function getVersionInfo() {
  return {
    application: APP_VERSION,
    release: RELEASE_NAME,
    runtime: RUNTIME_CORE_VERSION,
    schema: SCHEMA_VERSION,
  };
}
