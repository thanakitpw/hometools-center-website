import { NextResponse, type NextRequest } from 'next/server';
import { findRedirect } from '@/lib/queries/redirects';
import { updateSession } from '@/lib/supabase/middleware';
import { siteConfig } from '@/lib/site-config';

const CANONICAL_HOST = new URL(siteConfig.url).host.replace(/^www\./, '');

/**
 * Any host that isn't the live domain (vercel.app deploys, previews, localhost) is served
 * noindex, so the pre-launch site can't be indexed alongside the WordPress original.
 * Clears itself once DNS points the real domain here — no flag to remember at cutover.
 * robots.txt stays crawlable on purpose: Google must fetch the page to see this header.
 */
function guardIndexing<T extends NextResponse>(response: T, request: NextRequest): T {
  const host = (request.headers.get('host') ?? '').replace(/^www\./, '');
  if (host !== CANONICAL_HOST) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const { response, user } = await updateSession(request);
    const isLogin = pathname === '/admin/login';
    if (!user && !isLogin) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('next', pathname);
      return guardIndexing(NextResponse.redirect(url), request);
    }
    if (user && isLogin) {
      return guardIndexing(NextResponse.redirect(new URL('/admin', request.url)), request);
    }
    return guardIndexing(response, request);
  }

  const hit = await findRedirect(pathname);
  if (hit) {
    const dest = new URL(hit.to_path, request.url);
    dest.search = search;
    return guardIndexing(
      NextResponse.redirect(dest, hit.status_code as 301 | 302 | 307 | 308),
      request
    );
  }
  return guardIndexing(NextResponse.next(), request);
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?)).*)',
  ],
};
