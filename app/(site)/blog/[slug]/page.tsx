import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';
import { getPostBySlug, getAllPostSlugs, getRelatedPosts } from '@/lib/queries/posts';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd } from '@/components/site/json-ld';
import { articleSchema, breadcrumbSchema, faqSchema } from '@/lib/seo/schema';
import { extractFaq } from '@/lib/seo/faq';

export const revalidate = 3600;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPostBySlug(slug);
  if (!p) return { title: 'ไม่พบบทความ' };
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.excerpt || undefined;
  const image = p.og_image_url || p.cover_image_url;
  return {
    title,
    description,
    ...(p.tags?.length ? { keywords: p.tags } : {}),
    ...(p.author ? { authors: [{ name: p.author }] } : {}),
    openGraph: {
      title,
      description,
      url: `/blog/${p.slug}`,
      images: image ? [image] : [],
      type: 'article',
      publishedTime: p.published_at || undefined,
      modifiedTime: p.updated_at || p.published_at || undefined,
      ...(p.tags?.length ? { tags: [...p.tags] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : [],
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
  const faq = extractFaq(p.content_md);

  return (
    <>
      <JsonLd
        data={[
          articleSchema(p),
          ...(faq.length ? [faqSchema(faq)] : []),
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
        <article className="mt-8">
          <h1 className="!text-[1.75rem] !leading-[1.3] !text-[var(--color-fg)] md:!text-[2.25rem]">{p.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[var(--color-border)] pb-5 text-sm text-[var(--color-muted-fg)]">
            {p.author && <span>โดย {p.author}</span>}
            {p.author && p.published_at && <span aria-hidden>·</span>}
            {p.published_at && (
              <time dateTime={p.published_at}>
                {new Date(p.published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            )}
          </p>
          {p.cover_image_url ? (
            <img
              src={p.cover_image_url}
              alt={p.title}
              width={1200}
              height={630}
              className="mt-8 aspect-[1200/630] w-full rounded-lg object-cover"
            />
          ) : (
            // Placeholder until the client supplies real cover art. Posts that already
            // have a cover are unaffected.
            <div className="mt-8 flex aspect-[1200/630] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-fg)]">
              <ImageIcon className="h-9 w-9" strokeWidth={1.5} aria-hidden />
              <p className="text-sm">ภาพหน้าปกบทความ</p>
            </div>
          )}
          {/* `article-body` (app/globals.css) styles this CMS HTML. It replaces a
              `prose` class that never resolved — @tailwindcss/typography isn't installed. */}
          <div className="article-body mt-10" dangerouslySetInnerHTML={{ __html: p.content_md || '' }} />
          {p.tags?.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-6">
              {p.tags.map(t => (
                <li
                  key={t}
                  className="rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs text-[var(--color-muted-fg)]"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
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
