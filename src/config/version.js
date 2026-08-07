import '../utils/autoAttendanceDefaults.js';
import '../utils/week0ConductPolicy.js';

export const APP_VERSION = '11.6.11';
export const RELEASE_NAME = 'Week 0 Conduct Assessment';
export const RUNTIME_CORE_VERSION = '2.6.7';
export const SCHEMA_VERSION = '11.4.2';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}