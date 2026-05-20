import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getRelatedProducts } from '@/lib/queries/products';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { ProductCard } from '@/components/site/product-card';
import { QuoteDialog } from '@/components/site/quote-dialog';
import { Phone, FileText } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

export const revalidate = 3600;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'ไม่พบสินค้า' };
  return {
    title: p.seo_title || p.name_th,
    description: p.seo_description || p.short_description?.slice(0, 160) || undefined,
    openGraph: {
      title: p.seo_title || p.name_th,
      description: p.seo_description || undefined,
      images: p.og_image_url ? [p.og_image_url] : p.images[0]?.src ? [p.images[0].src] : [],
      type: 'website',
    },
    alternates: { canonical: `/product/${p.slug}` },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const related = await getRelatedProducts(p.id, 4);
  const mainImg = p.images[0]?.src;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name_th,
    sku: p.sku || undefined,
    description: p.short_description || p.seo_description || undefined,
    image: p.images.map(i => i.src),
    offers: {
      '@type': 'Offer',
      url: `${siteConfig.url}/product/${p.slug}`,
      availability: 'https://schema.org/InStock',
      priceCurrency: 'THB',
      priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'THB' },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <Breadcrumb
          items={[
            { label: 'หน้าหลัก', href: '/' },
            { label: 'สินค้าทั้งหมด', href: '/shop' },
            { label: p.name_th },
          ]}
        />
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 pb-12 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
            {mainImg ? (
              <img src={mainImg} alt={p.name_th} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-fg)]">ไม่มีรูป</div>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {p.images.slice(0, 10).map((img, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded border border-[var(--color-border)] bg-white">
                  <img src={img.src} alt={img.alt || ''} className="h-full w-full object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl !text-[var(--color-fg)] md:text-3xl">{p.name_th}</h1>
          {p.sku && <p className="mt-1 text-xs text-[var(--color-muted-fg)]">SKU: {p.sku}</p>}

          <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-5 text-center">
            <p className="text-sm text-[var(--color-muted-fg)]">ติดต่อขอใบเสนอราคา</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-accent-500)]">ขอใบเสนอราคา</p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <QuoteDialog
                triggerLabel="ส่งคำขอออนไลน์"
                productSlug={p.slug}
                productName={p.name_th}
                className="bg-[var(--color-brand-500)] hover:bg-[var(--color-brand-600)]"
              />
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-500)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-500)] hover:bg-white"
              >
                <Phone className="h-4 w-4" /> {siteConfig.contact.phone}
              </a>
            </div>
          </div>

          {p.short_description && (
            <div className="mt-6">
              <h2 className="!text-base !text-[var(--color-fg)]">รายละเอียดสินค้า</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-body)]">{p.short_description}</p>
            </div>
          )}

          {p.specs && p.specs.length > 0 && (
            <div className="mt-6">
              <h2 className="!text-base !text-[var(--color-fg)]">คุณสมบัติ</h2>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {p.specs.map((s, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)]">
                      <td className="py-1.5 pr-3 font-medium text-[var(--color-fg)]">{s.key}</td>
                      <td className="py-1.5 text-[var(--color-body)]">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {p.catalog_pdf_url && (
            <a
              href={p.catalog_pdf_url}
              target="_blank"
              rel="noopener"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-brand-500)] hover:underline"
            >
              <FileText className="h-4 w-4" /> ดาวน์โหลด Catalog
            </a>
          )}
        </div>
      </div>

      {p.description_md && (
        <section className="bg-[var(--color-muted)]">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <h2 className="!text-xl !text-[var(--color-fg)]">รายละเอียดเพิ่มเติม</h2>
            <div className="prose prose-sm mt-4 max-w-none whitespace-pre-line text-[var(--color-body)]">
              {p.description_md}
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="text-center !text-[var(--color-brand-light)]">สินค้าที่เกี่ยวข้อง</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map(r => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
