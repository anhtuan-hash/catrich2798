import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const settings = read('src/pages/Settings.jsx');
const css = read('src/styles/SettingsAccountDrawerRefinement.css');
const globalProfile = read('src/components/GlobalUserProfileSettingsBridge.jsx');
const legacyProfile = read('src/components/UsernameAccountCenter.jsx');
const drawer = read('src/styles/SettingsLauncherDrawerRedesign.css');

assert.match(settings, /import '\.\.\/styles\/SettingsLauncherPortalCompat\.css';\s*import '\.\.\/styles\/SettingsAccountDrawerRefinement\.css';/,
  'Account repair must load after the portal CSS to override its old grid');
assert.match(settings, /className="settings-account-password-grid"/,
  'Password fields need a dedicated responsive group');
assert.equal((settings.match(/autoComplete="new-password"/g) || []).length, 2,
  'Both new password fields should support password managers');
assert.match(settings, /autoComplete="current-password"/);
assert.match(settings, /changeCurrentPassword\(\{ currentPassword: passwordForm\.current, newPassword: passwordForm\.next \}\)/,
  'Retain the real Auth password-change handler');
assert.match(settings, /passwordStatus\.loading \|\| !canChangePassword/,
  'Unsupported provider must not show an enabled password action');
assert.match(settings, /role="status" aria-live="polite" className=\{`settings-google-inline-message/,
  'Server errors and success must be announced to screen readers');

assert.match(css, /\.settings-launcher-portal\[data-module="account"\]/,
  'All account-specific CSS must be portal scoped');
assert.doesNotMatch(css, /html body \.app-shell \.bes-profile-editor/,
  'Do not use the old app-shell-only selector to style portalled controls');
assert.match(css, /\.settings-v65-account-card\.has-bes-profile-editor > \.settings-v65-profile-panel\s*\{\s*display:\s*none\s*!important/,
  'Hide legacy read-only panel when editable profile mounts');
assert.match(css, /\.settings-google-profile-fallback\.has-account-center > \.settings-v65-avatar/,
  'Legacy account center should hide its duplicate read-only avatar');
assert.match(css, /\.settings-google-profile-fallback\.has-account-center > \.settings-v65-profile-copy/,
  'Legacy account center should hide its duplicate read-only text');
assert.match(css, /\.bes-profile-editor__fields,\.bes-settings-profile__grid/,
  'Both the active and legacy account profile editors should receive responsive form grids');
assert.match(css, /\.bes-profile-editor__intro,\.bes-settings-profile__identity/,
  'Both profile headers should get the corrected avatar/identity/action arrangement');
assert.match(css, /grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/,
  'Desktop profile fields should display in two columns');
assert.match(css, /@container\s*\(max-width:\s*670px\)/,
  'Narrow drawer should rearrange avatar actions without relying on viewport width');
assert.match(css, /@media\s*\(max-width:\s*590px\)/,
  'Mobile profile fields should stack vertically');
assert.match(css, /\.settings-account-password-grid > label:first-child/,
  'Current password should occupy a clear full-width first row');
assert.match(drawer, /position:\s*fixed\s*!important/,
  'Settings must continue using the stable body portal');
assert.match(globalProfile, /createPortal\(editor, portalTarget\)/,
  'Do not break live account profile persistence');
assert.match(legacyProfile, /createPortal\(profileEditor, profileHost\)/,
  'Keep compatibility for the existing legacy profile host');

console.log('PASS: account drawer profile, avatar, password and responsive portal layout contracts.');
