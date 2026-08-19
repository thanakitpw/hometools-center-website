import type { Metadata } from 'next';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';
import { Suspense } from 'react';
import { listPosts } from '@/lib/queries/posts';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { Pagination } from '@/components/site/pagination';
import { BlogGridSkeleton } from '@/components/site/skeletons';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'บทความและข่าวสาร',
  description: 'รวมบทความ ความรู้ และข่าวสาร เกี่ยวกับงานระบบ ท่อ ประปา และวัสดุก่อสร้าง',
  alternates: { canonical: '/blog' },
};

type SearchParams = { page?: string };

/**
 * The skeleton lives in a Suspense boundary inside the page, not in a loading.tsx:
 * a loading.tsx here would also wrap /blog/[slug], and streaming that route commits
 * a 200 before its notFound() can run — turning missing posts into soft 404s.
 */
export default async function BlogIndex({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10));

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Breadcrumb items={[{ label: 'หน้าหลัก', href: '/' }, { label: 'บทความ' }]} />
      <h1 className="mt-6 !text-2xl !text-[var(--color-fg)] md:!text-3xl">บทความและข่าวสาร</h1>

      <Suspense key={page} fallback={<BlogGridSkeleton />}>
        <PostGrid page={page} />
      </Suspense>
    </div>
  );
}

async function PostGrid({ page }: { page: number }) {
  const perPage = 12;
  const { items, total } = await listPosts({ page, perPage });
  const totalPages = Math.ceil(total / perPage);

  return (
    <>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(p => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}` as any}
            className="group overflow-hidden rounded-lg border border-[var(--color-border)] bg-white transition-shadow hover:shadow-md"
          >
            <div className="aspect-[1200/630] overflow-hidden bg-[var(--color-muted)]">
              {p.cover_image_url ? (
                <img
                  src={p.cover_image_url}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--color-muted-fg)]">
                  <ImageIcon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                  <span className="text-xs">ภาพหน้าปกบทความ</span>
                </div>
              )}
            </div>
            <div className="p-4">
              {p.status !== 'published' && (
                <span className="mb-2 inline-block rounded bg-[var(--color-accent-500)] px-2 py-0.5 text-[10px] font-semibold text-white">
                  DRAFT
                </span>
              )}
              <h3 className="line-clamp-2 text-base font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-brand-500)]">
                {p.title}
              </h3>
              {p.published_at && (
                <p className="mt-2 text-xs text-[var(--color-muted-fg)]">
                  {new Date(p.published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} baseUrl="/blog" />
    </>
  );
}
