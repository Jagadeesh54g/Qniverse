import { NextResponse } from 'next/server';

const COOKIE_NAME = 'qniverse_session';

function base64UrlToUint8Array(value) {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded =
    normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifySession(token) {
  try {
    if (!token) {
      return false;
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      console.error('AUTH_SECRET is missing in middleware');
      return false;
    }

    const parts = token.split('.');

    if (parts.length !== 2) {
      console.error('Invalid session format');
      return false;
    }

    const [payload, signature] = parts;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      {
        name: 'HMAC',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    const validSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToUint8Array(signature),
      new TextEncoder().encode(payload)
    );

    if (!validSignature) {
      console.error('Invalid Qniverse session signature');
      return false;
    }

    const data = JSON.parse(
      new TextDecoder().decode(
        base64UrlToUint8Array(payload)
      )
    );

    if (!data?.id || !data?.exp) {
      return false;
    }

    if (Date.now() >= data.exp * 1000) {
      console.error('Qniverse session expired');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Middleware session verification failed:', error);
    return false;
  }
}

export async function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const valid = await verifySession(token);

  if (!valid) {
    const url = request.nextUrl.clone();

    url.pathname = '/sign-in';
    url.searchParams.set(
      'next',
      request.nextUrl.pathname
    );

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/learn/:path*',
    '/playground/:path*',
    '/algorithms/:path*',
    '/challenges/:path*',
    '/progress/:path*',
    '/onboarding/:path*',
  ],
};