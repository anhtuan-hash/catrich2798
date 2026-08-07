import '../utils/autoAttendanceDefaults.js';
import '../utils/week0ConductPolicy.js';
import '../styles/hide-conduct-period.css';

export const APP_VERSION = '11.6.20';
export const RELEASE_NAME = 'Approved Apps Control Stack';
export const RUNTIME_CORE_VERSION = '2.6.7';
export const SCHEMA_VERSION = '11.4.2';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}