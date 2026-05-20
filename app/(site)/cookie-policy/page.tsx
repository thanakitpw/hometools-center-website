import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStaticPage } from '@/lib/static-pages';
import { PageRenderer } from '@/components/site/page-renderer';
import { Breadcrumb } from '@/components/site/breadcrumb';

const SLUG = 'cookie-policy';

export async function generateMetadata(): Promise<Metadata> {
  const p = getStaticPage(SLUG);
  return {
    title: p?.title || 'นโยบายคุกกี้',
    description: p?.seo_description || undefined,
    alternates: { canonical: `/${SLUG}` },
  };
}

export default function Page() {
  const p = getStaticPage(SLUG);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Breadcrumb items={[{ label: 'หน้าหลัก', href: '/' }, { label: 'นโยบายคุกกี้' }]} />
      <div className="mt-6">
        <PageRenderer page={p} />
      </div>
    </div>
  );
}
