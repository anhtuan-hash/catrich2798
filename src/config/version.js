import '../data/registerWordOrbit.js';
import '../data/registerActivityGraph.js';

export const APP_VERSION = '11.6.8';
export const RELEASE_NAME = 'Activity Graph Route Fix';
export const RUNTIME_CORE_VERSION = '2.6.7';
export const SCHEMA_VERSION = '11.4.2';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}