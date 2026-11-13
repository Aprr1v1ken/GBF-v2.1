import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_VERCEL_URL,
  getInstallTargetUrl,
  isLocalOrEphemeralHost,
  buildAndroidShareWhatsAppUrl,
  buildPwaBuilderUrl,
} from '../src/utils/pwa-helpers.ts';

test('getInstallTargetUrl appends ?install=1 cleanly without double slashes', () => {
  assert.equal(getInstallTargetUrl('https://gmit-betel-fuimelang.vercel.app/'), 'https://gmit-betel-fuimelang.vercel.app/?install=1');
  assert.equal(getInstallTargetUrl(''), `${PRODUCTION_VERCEL_URL}/?install=1`);
});

test('isLocalOrEphemeralHost detects localhost vs public deployment domain', () => {
  assert.equal(isLocalOrEphemeralHost('localhost'), true);
  assert.equal(isLocalOrEphemeralHost('192.168.1.5'), true);
  assert.equal(isLocalOrEphemeralHost('gmit-betel-fuimelang.vercel.app'), false);
});

test('WhatsApp & PWABuilder URLs encode clean deployment URL', () => {
  const wa = buildAndroidShareWhatsAppUrl('https://gmit-betel-fuimelang.vercel.app');
  assert.ok(wa.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(wa).includes('https://gmit-betel-fuimelang.vercel.app/?install=1'));

  const pwabuilder = buildPwaBuilderUrl('https://gmit-betel-fuimelang.vercel.app/?install=1');
  assert.equal(
    pwabuilder,
    'https://www.pwabuilder.com/reportcard?site=https%3A%2F%2Fgmit-betel-fuimelang.vercel.app'
  );
});
