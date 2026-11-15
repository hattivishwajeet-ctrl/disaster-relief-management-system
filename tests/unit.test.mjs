import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { createSession, hashPassword, passwordMatches, session, sessionCookie } from '../server/security.mjs';

test('password hashes are salted and authenticate the original password', () => {
  const first = hashPassword('a test password');
  assert.notEqual(first,hashPassword('a test password'));
  assert.equal(passwordMatches('a test password',first),true);
  assert.equal(passwordMatches('wrong',first),false);
  assert.equal(passwordMatches('invalid-user',undefined),false);
});

test('session verifies signature and exposes the expected role', async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  const token = await createSession({ id:2,email:'user@relief.local',role:'admin' });
  const cookie = sessionCookie(token);
  assert.match(cookie,/HttpOnly; SameSite=Lax/);
  const payload = await session({ headers:{ cookie } });
  assert.equal(payload.id,2);
  assert.equal(payload.role,'admin');
  assert.equal(await session({ headers:{ cookie:'relief_session=' + token + 'tampered' } }),null);
});
