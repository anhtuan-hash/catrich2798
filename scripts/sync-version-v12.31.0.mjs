import fs from 'node:fs';
const version = `export const APP_VERSION = '12.31.0';
export const RELEASE_NAME = 'Three Apps Total Removal';
export const RUNTIME_CORE_VERSION = '3.6.4';
export const SCHEMA_VERSION = '11.4.2';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}
`;
fs.writeFileSync('src/config/version.js', version);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '12.31.0';
pkg.description = 'Brian English Studio V12.31.0 — removes Content Ecosystem, Collaboration Hub and Automation Center from every website surface.';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Version synchronized to V12.31.0');
