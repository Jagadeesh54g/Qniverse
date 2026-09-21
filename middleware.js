import { NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  '/learn',
  '/playground',
  '/algorithms',
  '/challenges',
  '/progress',
  '/onboarding',
];

export async function middleware(request) {
  const { pathname, origin } = request.nextUrl;

  // Get the session cookie from the browser request.
  const sessionCookie = request.cookies.get('qniverse_session');

  // No session cookie -> definitely not authenticated.
  if (!sessionCookie?.value) {
    const url = new URL('/sign-in', origin);
    url.searchParams.set('next', pathname);

    return NextResponse.redirect(url);
  }

  try {
    /*
      IMPORTANT:

      Do not verify the session ourselves here.

      /api/auth/me is already successfully validating the
      qniverse_session cookie in your production deployment.

      Therefore middleware asks the exact same authentication
      system whether the current browser is authenticated.
    */

    const response = await fetch(`${origin}/api/auth/me`, {
      method: 'GET',
      headers: {
        cookie: `qniverse_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();

      if (data?.authenticated === true && data?.user) {
        return NextResponse.next();
      }
    }

    // Authentication failed.
    const url = new URL('/sign-in', origin);
    url.searchParams.set('next', pathname);

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Qniverse middleware auth check failed:', error);

    const url = new URL('/sign-in', origin);
    url.searchParams.set('next', pathname);

    return NextResponse.redirect(url);
  }
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