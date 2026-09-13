import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMobileNavigationModel } from '../../src/components/mobile/mobileNavigation.js';

const allow = (route) => !['admin', 'app-vault'].includes(route);

test('authenticated navigation keeps five primary destinations', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: false,
  });
  assert.deepEqual(model.bottomItems.map((item) => item.id), ['home', 'apps', 'practice', 'notifications', 'account']);
});

test('attendance replaces practice as the center action when available', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: true,
  });
  assert.equal(model.bottomItems[2].id, 'attendance');
  assert.equal(model.bottomItems[2].action, 'attendance');
});

test('forbidden routes are not emitted in More groups', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: false,
  });
  const routes = model.moreGroups.flatMap((group) => group.items).map((item) => item.route);
  assert.equal(routes.includes('admin'), false);
  assert.equal(routes.includes('app-vault'), false);
});

test('guest navigation exposes only public-safe items', () => {
  const model = buildMobileNavigationModel({
    authenticated: false,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: () => false,
    canAccessAttendance: false,
  });
  assert.deepEqual(model.bottomItems.map((item) => item.id), ['home', 'resources', 'search', 'contact', 'login']);
});
