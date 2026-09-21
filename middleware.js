import { NextResponse } from 'next/server';
const COOKIE = 'qniverse_session';

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function validSession(token) {
  if (!token || !process.env.AUTH_SECRET) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(process.env.AUTH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(payload)
    );
    if (!valid) return false;
    const data = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    return !!data?.id && !!data?.exp && Date.now() < data.exp * 1000;
  } catch {
    return false;
  }
}

export async function middleware(request) {
  const token = request.cookies.get(COOKIE)?.value;
  const authenticated = await validSession(token);

  if (!authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/learn/:path*', '/playground/:path*', '/algorithms/:path*', '/challenges/:path*', '/progress/:path*', '/onboarding/:path*'],
};
