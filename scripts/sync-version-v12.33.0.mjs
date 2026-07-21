import fs from 'node:fs';
const version = `export const APP_VERSION = '12.33.0';
export const RELEASE_NAME = 'Unified AI Core Phase 2';
export const RUNTIME_CORE_VERSION = '3.8.0';
export const SCHEMA_VERSION = '11.4.2';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}
`;
fs.writeFileSync('src/config/version.js', version);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '12.33.0';
pkg.description = 'Brian English Studio V12.33.0 — adds a unified Privacy Filter, structured Output Guard, automatic repair and AI safety provenance.';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Version synchronized to V12.33.0');
