import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/mongodb';
import { explainMongoError } from '@/lib/mongo-errors.mjs';
import { User } from '@/models';
import { createSession, sessionCookieOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function passwordMatches(password, stored) {
  const [salt, digest] = String(stored || '').split(':');
  if (!salt || !digest) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(digest, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    onboardingComplete: !!user.onboardingComplete,
    learnerLevel: user.learnerLevel || 'curious',
  };
}

function fail(message, status) {
  return NextResponse.json({ ok: false, message }, { status });
}

function safeError(error) {
  const message = String(error?.message || 'Authentication failed.');
  if (/duplicate key|E11000/i.test(message)) {
    return 'An account with that email already exists.';
  }
  const hint = explainMongoError(error);
  if (hint) {
    // Full detail in dev; generic in production so we don't leak setup info.
    return process.env.NODE_ENV === 'production'
      ? 'Qniverse could not reach its database. Please try again shortly.'
      : hint;
  }
  if (process.env.NODE_ENV === 'production') return 'Authentication failed. Please try again.';
  return message;
}

export async function POST(request) {
  if (!process.env.MONGODB_URI || !process.env.AUTH_SECRET) {
    return fail('Authentication is not configured. Add MONGODB_URI and AUTH_SECRET to .env.local and restart the server.', 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.', 400);
  }

  try {
    const action = body.action === 'signup' ? 'signup' : 'signin';
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Enter a valid email address.', 400);
    if (password.length < 8) return fail('Use a password with at least 8 characters.', 400);
    if (action === 'signup' && !name) return fail('Tell us your name first.', 400);

    await db();
    let user = await User.findOne({ email });

    if (action === 'signup') {
      if (user) return fail('An account with that email already exists.', 409);
      user = await User.create({
        name: name.slice(0, 80),
        email,
        passwordHash: hashPassword(password),
      });
    } else {
      if (!user || !passwordMatches(password, user.passwordHash)) {
        return fail('Email or password is incorrect.', 401);
      }
      user.lastLoginAt = new Date();
      await user.save();
    }

    // NextResponse (not the plain Response) is what has the .cookies API.
    const response = NextResponse.json({ ok: true, user: publicUser(user) });
    response.cookies.set({
      ...sessionCookieOptions(),
      value: createSession(user),
    });
    return response;
  } catch (error) {
    console.error('[Qniverse auth]', error);
    const status = /duplicate key|E11000/i.test(String(error?.message)) ? 409 : 500;
    return fail(safeError(error), status);
  }
}
