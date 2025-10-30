import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const pathname = req.nextUrl.pathname;
    const isAuthPage = pathname.startsWith('/auth') || pathname === '/login';

    // Prevent redirect loop by not redirecting on the signin page
    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }

    // Protect admin dashboard routes (pages)
    if (pathname.startsWith('/dashboard/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Protect settings page (admin only)
    if (pathname.startsWith('/dashboard/settings') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Protect admin API routes
    if (pathname.startsWith('/api/admin') && token?.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Protect settings API (admin only)
    if (pathname.startsWith('/api/settings') && token?.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Allow auth pages and login without token
        if (path.startsWith('/auth') || path === '/login') {
          return true;
        }
        
        // Allow only specific public API endpoints by tokenized path
        if (path.startsWith('/api/upload-links/validate/')) {
          return true;
        }
        if (path.startsWith('/api/upload/')) {
          return true;
        }
        if (path.startsWith('/api/download/')) {
          return true;
        }
        
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/api/activities/:path*',
    '/api/admin/:path*',
    '/api/companies/:path*',
    '/api/documents/:path*',
    '/api/employees/:path*',
    '/api/download-links/:path*',
    '/api/upload-links/cleanup',
    '/api/upload-links/:id',
    '/api/settings/:path*',
    // Explicitly exclude public routes:
    // /api/upload-links/validate/:token
    // /api/upload/:token
    // /api/download/:token
  ],
}; 