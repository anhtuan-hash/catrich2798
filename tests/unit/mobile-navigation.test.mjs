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

test('practice center action targets the live weekly practice block instead of retired route', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: false,
  });
  assert.equal(model.bottomItems[2].action, 'practice');
  assert.equal(model.bottomItems[2].route, undefined);
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

test('drawer base mirrors original compact navigation instead of app catalog groups', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: false,
    isAdminNavigation: false,
  });

  assert.deepEqual(model.drawerBaseItems.map((item) => [item.id, item.label]), [
    ['home', 'Trang chủ'],
    ['apps', 'Ứng dụng'],
  ]);
  assert.equal('moreGroups' in model, false);
});

test('admin drawer keeps the original Admin primary tab', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: () => true,
    canAccessAttendance: true,
    isAdminNavigation: true,
  });

  assert.deepEqual(model.drawerBaseItems.map((item) => item.id), ['home', 'apps', 'admin']);
});

test('guest navigation exposes only public-safe bottom items and Home in original drawer', () => {
  const model = buildMobileNavigationModel({
    authenticated: false,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: () => false,
    canAccessAttendance: false,
  });
  assert.deepEqual(model.bottomItems.map((item) => item.id), ['home', 'resources', 'search', 'contact', 'login']);
  assert.deepEqual(model.drawerBaseItems.map((item) => item.id), ['home']);
});