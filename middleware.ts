import { NextResponse, type NextRequest } from 'next/server';
import { findRedirect } from '@/lib/queries/redirects';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hit = await findRedirect(pathname);
  if (hit) {
    const dest = new URL(hit.to_path, request.url);
    dest.search = search;
    return NextResponse.redirect(dest, hit.status_code as 301 | 302 | 307 | 308);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, public assets, admin, api, and known static routes that exist now
  matcher: [
    '/((?!_next/|api/|admin/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?)).*)',
  ],
};
