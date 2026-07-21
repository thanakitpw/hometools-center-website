import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/queries/products';
import { getCategoryById } from '@/lib/queries/categories';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { ProductCard } from '@/components/site/product-card';
import { ProductGallery } from '@/components/site/product-gallery';
import { PdfFlipbook } from '@/components/site/pdf-flipbook';
import { QuoteDialog } from '@/components/site/quote-dialog';
import { Download, Phone, Award, Truck, BadgeCheck } from 'lucide-react';
import { SiLine } from '@icons-pack/react-simple-icons';
import { siteConfig } from '@/lib/site-config';
import { JsonLd } from '@/components/site/json-ld';
import { productSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { buildProductDescription } from '@/lib/product-description';

export const revalidate = 3600;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'ไม่พบสินค้า' };
  return {
    title: p.seo_title || p.name_th,
    description: p.seo_description || p.short_description?.replace(/<[^>]+>/g, '').slice(0, 160) || undefined,
    openGraph: {
      title: p.seo_title || p.name_th,
      description: p.seo_description || undefined,
      images: p.og_image_url ? [p.og_image_url] : p.images[0]?.src ? [p.images[0].src] : [],
      type: 'website',
    },
    alternates: { canonical: `/product/${p.slug}` },
  };
}

const trustBadges = [
  { icon: Award, label: 'ประสบการณ์กว่า 30 ปี' },
  { icon: Truck, label: 'จัดส่งทั่วประเทศ' },
  { icon: BadgeCheck, label: 'สินค้าของแท้ 100%' },
];

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const [related, category] = await Promise.all([
    getRelatedProducts(p.id, 4),
    getCategoryById(p.primary_category_id),
  ]);

  const phoneDigits = siteConfig.contact.phone.replace(/[^0-9]/g, '');
  // The full WordPress body lives in description_md; short_description is only the
  // excerpt, and rendering that alone is what left these pages looking empty.
  const desc = buildProductDescription(p.description_md, p.short_description);
  const hasRealDesc = desc.hasContent;
  const hasPdf = !!p.catalog_pdf_url;
  const hasSpecs = !!(p.specs && p.specs.length > 0);

  return (
    <>
      <JsonLd
        data={[
          productSchema(p),
          breadcrumbSchema([
            { name: 'หน้าแรก', path: '/' },
            { name: 'สินค้าทั้งหมด', path: '/shop' },
            ...(category ? [{ name: category.name_th, path: `/product-category/${category.path}` }] : []),
            { name: p.name_th, path: `/product/${p.slug}` },
          ]),
        ]}
      />

      <div className="mx-auto max-w-[1140px] px-6 py-8">
        <Breadcrumb
          items={[
            { label: 'หน้าแรก', href: '/' },
            { label: 'สินค้าทั้งหมด', href: '/shop' },
            ...(category ? [{ label: category.name_th, href: `/product-category/${category.path}` }] : []),
            { label: p.name_th },
          ]}
        />

        {/* ===== HERO: 2 columns ===== */}
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* gallery */}
          <ProductGallery images={p.images} name={p.name_th} />

          {/* info */}
          <div>
            {category && (
              <Link
                href={`/product-category/${category.path}` as never}
                className="inline-block rounded-full bg-[var(--color-brand-50)] px-3 py-1 text-[13px] font-medium text-[var(--color-brand-500)] transition-colors hover:bg-[var(--color-brand-100)]"
              >
                {category.name_th}
              </Link>
            )}

            <h1 className="mt-3 !text-[26px] !font-bold !leading-tight !text-[#111111] md:!text-[32px]">
              {p.name_th}
            </h1>
            {p.sku && <p className="mt-2 text-sm text-[var(--color-muted-fg)]">รหัสสินค้า: {p.sku}</p>}

            {/* CTA card */}
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-5">
              <p className="text-[15px] text-[var(--color-body)]">
                สนใจสินค้านี้? ขอใบเสนอราคาฟรี ทีมงานติดต่อกลับรวดเร็ว
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <QuoteDialog
                  triggerLabel="ขอใบเสนอราคา"
                  productSlug={p.slug}
                  productName={p.name_th}
                  className="h-12 flex-1 rounded-full bg-[var(--color-accent-500)] px-8 text-[16px] font-semibold hover:bg-[var(--color-accent-600)]"
                />
                {p.catalog_pdf_url && (
                  <a
                    href={p.catalog_pdf_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-[var(--color-brand-500)] px-6 text-[16px] font-semibold text-[var(--color-brand-500)] transition-colors hover:bg-[var(--color-brand-500)] hover:text-white"
                  >
                    <Download className="h-5 w-5" /> แคตตาล็อก PDF
                  </a>
                )}
              </div>

              {/* quick contact */}
              <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
                <span className="text-sm text-[var(--color-muted-fg)]">ติดต่อด่วน:</span>
                <a
                  href={`tel:${phoneDigits}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-[var(--color-brand-500)] shadow-sm ring-1 ring-[var(--color-border)] transition hover:ring-[var(--color-brand-500)]"
                >
                  <Phone className="h-4 w-4" /> {siteConfig.contact.phone}
                </a>
                <a
                  href={siteConfig.social.line}
                  target="_blank"
                  rel="noopener"
                  aria-label="ติดต่อทาง LINE"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#06c755] px-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  <SiLine className="h-4 w-4" color="#ffffff" /> LINE
                </a>
              </div>
            </div>

            {/* trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 text-center">
                  <b.icon className="h-6 w-6 text-[var(--color-brand-500)]" />
                  <span className="text-[12px] font-medium leading-tight text-[var(--color-body)]">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== CATALOG PDF + DETAIL + SPECS ===== */}
        {(hasPdf || hasRealDesc || hasSpecs) && (
          <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              {hasPdf && (
                <section>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="!mb-0 !text-[22px] !font-bold !text-[var(--color-brand-light)]">แคตตาล็อกสินค้า</h2>
                    <a
                      href={p.catalog_pdf_url!}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand-500)] px-4 py-1.5 text-sm font-medium text-[var(--color-brand-500)] transition-colors hover:bg-[var(--color-brand-500)] hover:text-white"
                    >
                      <Download className="h-4 w-4" /> เปิดเต็มจอ / ดาวน์โหลด
                    </a>
                  </div>
                  <PdfFlipbook url={p.catalog_pdf_url!} title={`แคตตาล็อก ${p.name_th}`} />
                </section>
              )}

              {hasRealDesc && (
                <section className={hasPdf ? 'mt-10' : ''}>
                  <h2 className="!mb-4 !text-[22px] !font-bold !text-[var(--color-brand-light)]">รายละเอียดสินค้า</h2>
                  <div
                    className="product-desc text-[15px] leading-[1.9] text-[#2f4d70] [&_a]:text-[var(--color-brand-500)] [&_img]:mx-auto [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_p]:my-2 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:p-2 [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:bg-[var(--color-muted)] [&_th]:p-2"
                    dangerouslySetInnerHTML={{ __html: desc.html }}
                  />
                </section>
              )}

              {hasSpecs && (
                <section className={hasPdf || hasRealDesc ? 'mt-10' : ''}>
                  <h2 className="!mb-4 !text-[22px] !font-bold !text-[var(--color-brand-light)]">คุณสมบัติ</h2>
                  <table className="w-full overflow-hidden rounded-lg border border-[var(--color-border)] text-sm">
                    <tbody>
                      {p.specs!.map((s, i) => (
                        <tr key={i} className={i % 2 ? 'bg-[var(--color-muted)]/40' : 'bg-white'}>
                          <td className="w-1/3 border-b border-[var(--color-border)] px-4 py-2.5 font-semibold text-[#1c4c86]">{s.key}</td>
                          <td className="border-b border-[var(--color-border)] px-4 py-2.5 text-[#2f4d70]">{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </div>

            {/* side help card */}
            <aside className="lg:pt-1">
              <div className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-brand-50)] to-white p-5">
                <h3 className="!text-[16px] !font-bold !text-[var(--color-brand-700)]">ต้องการคำปรึกษา?</h3>
                <p className="mt-2 text-sm text-[var(--color-body)]">
                  ทีมงานผู้เชี่ยวชาญพร้อมช่วยเลือกสินค้าให้ตรงงานของคุณ
                </p>
                <a
                  href={`tel:${phoneDigits}`}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-500)] text-sm font-semibold text-white transition hover:bg-[var(--color-brand-600)]"
                >
                  <Phone className="h-4 w-4" /> {siteConfig.contact.phone}
                </a>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ===== RELATED ===== */}
      {related.length > 0 && (
        <section className="mx-auto max-w-[1140px] px-6 pb-20 pt-6">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#b8d6ff]" />
            <h2 className="!mb-0 text-center !text-[26px] !font-semibold !text-[var(--color-brand-light)]">สินค้าที่เกี่ยวข้อง</h2>
            <div className="h-px flex-1 bg-[#b8d6ff]" />
          </div>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {related.map(r => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
