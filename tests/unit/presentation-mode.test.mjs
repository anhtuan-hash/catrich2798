import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readPresentationOverride,
  resolvePresentationMode,
} from '../../src/device/presentationMode.js';

const base = {
  userAgent: '',
  userAgentDataMobile: null,
  platform: '',
  maxTouchPoints: 0,
  coarsePointer: false,
  hoverNone: false,
  screenWidth: 1440,
  screenHeight: 900,
  orientationType: 'landscape-primary',
};

test('iPhone is mobile in portrait and landscape', () => {
  for (const orientationType of ['portrait-primary', 'landscape-primary']) {
    const result = resolvePresentationMode({
      ...base,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      platform: 'iPhone',
      maxTouchPoints: 5,
      coarsePointer: true,
      hoverNone: true,
      screenWidth: orientationType.startsWith('portrait') ? 393 : 852,
      screenHeight: orientationType.startsWith('portrait') ? 852 : 393,
      orientationType,
    });
    assert.equal(result.deviceClass, 'phone');
    assert.equal(result.presentationMode, 'mobile');
  }
});

test('classic iPad UA is tablet even though it contains Mobile', () => {
  const common = {
    ...base,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    userAgentDataMobile: true,
    platform: 'iPad',
    maxTouchPoints: 5,
    coarsePointer: true,
    hoverNone: true,
  };
  const portrait = resolvePresentationMode({ ...common, screenWidth: 834, screenHeight: 1194, orientationType: 'portrait-primary' });
  const landscape = resolvePresentationMode({ ...common, screenWidth: 1194, screenHeight: 834, orientationType: 'landscape-primary' });
  assert.equal(portrait.deviceClass, 'tablet');
  assert.equal(portrait.presentationMode, 'mobile');
  assert.equal(landscape.deviceClass, 'tablet');
  assert.equal(landscape.presentationMode, 'desktop');
});

test('iPadOS desktop-class UA is tablet and follows orientation', () => {
  const common = {
    ...base,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 5,
    coarsePointer: true,
    hoverNone: true,
  };
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 820, screenHeight: 1180, orientationType: 'portrait-primary' }).presentationMode, 'mobile');
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 1180, screenHeight: 820, orientationType: 'landscape-primary' }).presentationMode, 'desktop');
});

test('Android tablet follows orientation', () => {
  const common = {
    ...base,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-X810) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
    coarsePointer: true,
    hoverNone: true,
  };
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 800, screenHeight: 1280, orientationType: 'portrait-primary' }).deviceClass, 'tablet');
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 800, screenHeight: 1280, orientationType: 'portrait-primary' }).presentationMode, 'mobile');
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 1280, screenHeight: 800, orientationType: 'landscape-primary' }).presentationMode, 'desktop');
});

test('Mac laptop remains desktop even when the browser itself is narrow', () => {
  const result = resolvePresentationMode({
    ...base,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    platform: 'MacIntel',
    screenWidth: 1512,
    screenHeight: 982,
  });
  assert.equal(result.deviceClass, 'desktop');
  assert.equal(result.presentationMode, 'desktop');
});

test('touch-enabled Windows laptop remains desktop', () => {
  const result = resolvePresentationMode({
    ...base,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    platform: 'Win32',
    maxTouchPoints: 10,
    coarsePointer: false,
    hoverNone: false,
    screenWidth: 1920,
    screenHeight: 1200,
  });
  assert.equal(result.deviceClass, 'desktop');
  assert.equal(result.presentationMode, 'desktop');
});

test('developer override is accepted only when enabled', () => {
  assert.equal(readPresentationOverride('?besPresentation=mobile', true), 'mobile');
  assert.equal(readPresentationOverride('?besPresentation=desktop', true), 'desktop');
  assert.equal(readPresentationOverride('?besPresentation=mobile', false), null);
});