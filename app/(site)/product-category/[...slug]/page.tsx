import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  getCategoryByPath,
  getCategoryBySlug,
  getCategoryAncestors,
  getAllCategoryPaths,
  getChildCategories,
} from '@/lib/queries/categories';
import { listProductsByCategory } from '@/lib/queries/products';
import { ProductCard } from '@/components/site/product-card';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { CategorySidebar } from '@/components/site/category-sidebar';
import { Pagination } from '@/components/site/pagination';
import Link from 'next/link';
import { JsonLd } from '@/components/site/json-ld';
import { breadcrumbSchema, faqSchema, itemListSchema } from '@/lib/seo/schema';
import { extractFaq } from '@/lib/seo/faq';
import { splitCategoryContent } from '@/lib/category-content';

export const revalidate = 3600;

type Params = { slug: string[] };
type SearchParams = { page?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryByPath(slug.join('/'));
  if (!cat) return { title: 'ไม่พบหมวดหมู่' };
  return {
    title: cat.seo_title || `${cat.name_th} | Home Tool Center`,
    description: cat.seo_description || undefined,
    // WordPress used the category thumbnail as og:image — keep that, it's the only
    // place this square icon belongs (it is not a page banner).
    openGraph: {
      title: cat.seo_title || cat.name_th,
      description: cat.seo_description || undefined,
      images: cat.banner_image_url ? [cat.banner_image_url] : [],
      type: 'website',
    },
    alternates: { canonical: `/product-category/${cat.path}` },
  };
}

export async function generateStaticParams() {
  const paths = await getAllCategoryPaths();
  return paths.map(p => ({ slug: p.split('/') }));
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await getCategoryByPath(slug.join('/'));
  if (!cat) {
    // A bare leaf slug (or a stale ancestor chain) still points at a real category —
    // send it to the canonical full path instead of 404ing, as WordPress did.
    const byLeaf = await getCategoryBySlug(slug[slug.length - 1]);
    if (byLeaf) permanentRedirect(`/product-category/${byLeaf.path}`);
    notFound();
  }

  // `|| 1` because Math.max(1, NaN) is NaN, which would reach the query as range(NaN).
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const perPage = 12;
  const [{ items, total }, children, ancestors] = await Promise.all([
    listProductsByCategory(cat.id, { page, perPage }),
    getChildCategories(cat.id),
    getCategoryAncestors(cat),
  ]);
  // A page number past the end (stale WordPress pagination, hand-typed URLs) is a 404,
  // not an empty 200 that Google would index as a thin duplicate.
  if (page > 1 && items.length === 0) notFound();
  const totalPages = Math.ceil(total / perPage);
  // The long guide + FAQ belongs to the category's canonical (page 1) only; repeating it on
  // ?page=2… would just duplicate the copy across URLs.
  const content = splitCategoryContent(cat.description);
  const bodyHtml = page === 1 ? content.bodyHtml : null;
  const faq = extractFaq(bodyHtml);

  return (
    <div className="mx-auto max-w-[1560px] px-6 py-6">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'หน้าหลัก', path: '/' },
            { name: 'สินค้าทั้งหมด', path: '/shop' },
            ...ancestors.map(a => ({ name: a.name_th, path: `/product-category/${a.path}` })),
            { name: cat.name_th, path: `/product-category/${cat.path}` },
          ]),
          ...(items.length > 0
            ? [itemListSchema(items.map((p) => ({ name: p.name_th, path: `/product/${p.slug}` })))]
            : []),
          ...(faq.length > 0 ? [faqSchema(faq)] : []),
        ]}
      />
      <Breadcrumb
        items={[
          { label: 'หน้าหลัก', href: '/' },
          { label: 'สินค้าทั้งหมด', href: '/shop' },
          ...ancestors.map(a => ({ label: a.name_th, href: `/product-category/${a.path}` })),
          { label: cat.name_th },
        ]}
      />

      <div className="mt-6 grid gap-8 md:grid-cols-[240px_1fr] lg:gap-10">
        <CategorySidebar activePath={cat.path} />
        {/* min-w-0: a grid item defaults to min-width:auto, so the guide's tables would
            otherwise widen this column past the phone viewport instead of scrolling. */}
        <div className="min-w-0">
          <h1 className="!text-2xl !text-[var(--color-fg)] md:!text-3xl">หมวดหมู่: {cat.name_th}</h1>
          {content.introText && <p className="mt-2 text-[var(--color-body)]">{content.introText}</p>}
          {content.introHtml && (
            <div
              className="category-intro mt-3 max-w-[860px] text-[15px] leading-[1.8] text-[var(--color-body)]"
              dangerouslySetInnerHTML={{ __html: content.introHtml }}
            />
          )}

          {children.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {children.map(c => (
                <Link
                  key={c.id}
                  href={`/product-category/${c.path}` as any}
                  className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs hover:border-[var(--color-brand-500)] hover:text-[var(--color-brand-500)]"
                >
                  {c.name_th}
                </Link>
              ))}
            </div>
          )}

          <p className="mt-6 text-sm text-[var(--color-muted-fg)]">
            พบสินค้า {total} รายการ
          </p>

          {items.length === 0 ? (
            <p className="mt-10 text-center text-[var(--color-muted-fg)]">ยังไม่มีสินค้าในหมวดหมู่นี้</p>
          ) : (
            <div className="mt-4 grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} baseUrl={`/product-category/${cat.path}`} />

          {bodyHtml && (
            <section
              aria-label={`ข้อมูลเพิ่มเติมเกี่ยวกับ${cat.name_th}`}
              className="article-body mt-14 max-w-[860px] border-t border-[var(--color-border)] pt-10"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
