import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser, isValidAssociation } from '@/lib/auth';

// Routes that require family authentication
const protectedRoutes = [
  '/gallery',
  '/dashboard',
  '/api/items',
  '/api/dashboard',
  '/api/export',
];

// Public routes that don't require any authentication
const publicRoutes = [
  '/',
  '/api/auth',
  '/api/auth/logout',
  '/api/auth/check',
  '/_next',
  '/favicon.ico',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Handle association routes
  if (pathname.startsWith('/public/')) {
    const slugMatch = pathname.match(/^\/public\/([^/]+)/);
    if (slugMatch) {
      const slug = slugMatch[1];
      // Validate slug
      if (!isValidAssociation(slug)) {
        // Redirect to 404 or home
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    // Allow association routes
    return NextResponse.next();
  }

  // Check if route requires family auth
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const user = getCurrentUser(request);

    // No user found
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Association users cannot access family routes
    if (user.type === 'association') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
