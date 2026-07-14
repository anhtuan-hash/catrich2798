import crypto from 'node:crypto';
import { env } from './_googleDrive.js';

function previewSecret() {
  const secret = env.serviceKey || env.stateSecret || env.clientSecret;
  if (!secret) throw new Error('Preview signing secret is unavailable');
  return secret;
}

export function signResourcePreviewToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', previewSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyResourcePreviewToken(value) {
  const [body, signature] = String(value || '').split('.');
  if (!body || !signature) throw new Error('Invalid preview token');
  const expected = crypto.createHmac('sha256', previewSecret()).update(body).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) throw new Error('Invalid preview token');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload?.expiresAt || Number(payload.expiresAt) < Date.now()) throw new Error('Preview link has expired');
  return payload;
}
