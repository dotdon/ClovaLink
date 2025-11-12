import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const pathname = req.nextUrl.pathname;
    const isAuthPage = pathname.startsWith('/auth') || pathname === '/login';
    const isSettingsPage = pathname.startsWith('/dashboard/settings');
    const isAccountPage = pathname.startsWith('/dashboard/account');
    const isChangePasswordPage = pathname === '/auth/change-password';
    const isAPI = pathname.startsWith('/api');

    // Prevent redirect loop by not redirecting on the signin page
    if (isAuthPage) {
      if (isAuth && !isChangePasswordPage) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }

    // Note: Password change check is handled client-side in DashboardLayout
    // We can't use Prisma in Edge Runtime middleware, so we rely on client-side redirects
    // The change-password page itself is protected by client-side checks

    // Note: 2FA requirement is checked client-side in DashboardLayout component
    // We cannot use Prisma in Edge Runtime middleware, so we rely on client-side enforcement
    // The DashboardLayout component will redirect users who need 2FA to the account page

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
    '/api/auth/:path*',
    // Explicitly exclude public routes:
    // /api/upload-links/validate/:token
    // /api/upload/:token
    // /api/download/:token
  ],
}; 