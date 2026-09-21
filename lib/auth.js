import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/mongodb';
import { User } from '@/models';

const COOKIE = 'qniverse_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not configured.');
  return value;
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encode(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decode(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    name: COOKIE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  };
}

export function createSession(user) {
  return encode({
    id: String(user._id),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  });
}

export async function getAuthUser() {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    const session = decode(token);
    if (!session?.id) return null;

    await db();
    const user = await User.findById(session.id).lean();
    if (!user) return null;
    return user;
  } catch (error) {
    // Let Next.js handle its own "this route is dynamic" signal during build.
    if (error?.digest === 'DYNAMIC_SERVER_USAGE') throw error;
    // Don't fail silently: a DB or AUTH_SECRET problem here otherwise looks
    // like "logged out" and bounces the user back to /sign-in with no clue why.
    console.error('[Qniverse auth] getAuthUser failed:', error?.message || error);
    return null;
  }
}

export async function requireUser() {
  const user = await getAuthUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export function clearSessionCookie(response) {
  response.cookies.set({ ...sessionCookieOptions(), value: '', maxAge: 0 });
  return response;
}
