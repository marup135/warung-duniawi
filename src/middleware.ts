import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, COOKIE_NAME } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Jebakan / Honeypot untuk bot: Jika rute /admin diakses, kembalikan 404 palsu
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.rewrite(new URL('/_not-found', request.url));
  }

  // 2. Proteksi rute rahasia /kasir-447 dan endpoint /api/admin/*
  const isProtectedPage = pathname.startsWith('/kasir-447');
  const isProtectedApi = pathname.startsWith('/api/admin');

  if (isProtectedPage || isProtectedApi) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await decrypt(token) : null;

    // Jika belum ada session valid
    if (!session) {
      if (isProtectedApi) {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak: Silakan login terlebih dahulu' },
          { status: 401 }
        );
      }
      // Untuk halaman /kasir-447, biarkan dirender karena AdminDashboard memiliki form login di dalamnya
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/kasir-447/:path*', '/api/admin/:path*'],
};
