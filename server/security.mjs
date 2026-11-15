import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const lifetime = 8 * 3600;
const issuer = 'disaster-relief';

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must be at least 32 bytes');
  return Buffer.from(secret);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}

const dummyHash = hashPassword('invalid-user');

export function passwordMatches(password, stored) {
  const [salt, digest] = (stored || dummyHash).split(':');
  const expected = Buffer.from(digest, 'hex');
  return timingSafeEqual(expected, scryptSync(password, salt, expected.length)) && Boolean(stored);
}

export async function createSession(user) {
  return new SignJWT({ role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256' }).setIssuer(issuer).setAudience(issuer)
    .setSubject(String(user.id)).setIssuedAt().setExpirationTime('8h').sign(key());
}

export async function session(request) {
  const cookie = request.headers.cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith('relief_session='));
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie.slice('relief_session='.length), key(),
      { issuer, audience: issuer, algorithms: ['HS256'] });
    if (!['admin', 'volunteer'].includes(payload.role)) return null;
    return { id: Number(payload.sub), role: payload.role, email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}

export function sessionCookie(value) {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  return 'relief_session=' + value + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' +
    (value ? lifetime : 0) + secure;
}
