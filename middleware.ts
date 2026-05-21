import { NextResponse, type NextRequest } from 'next/server';
import { findRedirect } from '@/lib/queries/redirects';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const { response, user } = await updateSession(request);
    const isLogin = pathname === '/admin/login';
    if (!user && !isLogin) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (user && isLogin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return response;
  }

  const hit = await findRedirect(pathname);
  if (hit) {
    const dest = new URL(hit.to_path, request.url);
    dest.search = search;
    return NextResponse.redirect(dest, hit.status_code as 301 | 302 | 307 | 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?)).*)',
  ],
};
