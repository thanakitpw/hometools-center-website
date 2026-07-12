import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPostSlugs, getRelatedPosts } from '@/lib/queries/posts';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd } from '@/components/site/json-ld';
import { articleSchema, breadcrumbSchema } from '@/lib/seo/schema';

export const revalidate = 3600;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPostBySlug(slug);
  if (!p) return { title: 'ไม่พบบทความ' };
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || undefined,
    openGraph: {
      title: p.seo_title || p.title,
      description: p.seo_description || undefined,
      images: p.og_image_url ? [p.og_image_url] : p.cover_image_url ? [p.cover_image_url] : [],
      type: 'article',
      publishedTime: p.published_at || undefined,
    },
    alternates: { canonical: `/blog/${p.slug}` },
  };
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map(slug => ({ slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await getPostBySlug(slug);
  if (!p) notFound();
  const related = await getRelatedPosts(slug, 3);

  return (
    <>
      <JsonLd
        data={[
          articleSchema(p),
          breadcrumbSchema([
            { name: 'หน้าหลัก', path: '/' },
            { name: 'บทความ', path: '/blog' },
            { name: p.title, path: `/blog/${p.slug}` },
          ]),
        ]}
      />
      <div className="mx-auto max-w-3xl px-6 py-6">
        <Breadcrumb
          items={[
            { label: 'หน้าหลัก', href: '/' },
            { label: 'บทความ', href: '/blog' },
            { label: p.title },
          ]}
        />
        <article className="mt-6">
          <h1 className="!text-3xl !text-[var(--color-fg)] md:!text-4xl">{p.title}</h1>
          {p.published_at && (
            <p className="mt-2 text-sm text-[var(--color-muted-fg)]">
              {new Date(p.published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          {p.cover_image_url && (
            <img src={p.cover_image_url} alt={p.title} className="mt-6 w-full rounded-lg" />
          )}
          <div
            className="prose prose-base mt-8 max-w-none text-[var(--color-body)]"
            dangerouslySetInnerHTML={{ __html: p.content_md || '' }}
          />
        </article>

        {related.length > 0 && (
          <section className="mt-12 border-t border-[var(--color-border)] pt-8">
            <h2 className="!text-xl !text-[var(--color-fg)]">บทความที่เกี่ยวข้อง</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {related.map(r => (
                <Link
                  key={r.id}
                  href={`/blog/${r.slug}` as any}
                  className="group overflow-hidden rounded-lg border border-[var(--color-border)] bg-white"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[var(--color-muted)]">
                    {r.cover_image_url && <img src={r.cover_image_url} alt={r.title} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-medium group-hover:text-[var(--color-brand-500)]">{r.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
