import type { Metadata } from 'next';
import { listAllProducts } from '@/lib/queries/products';
import { ProductCard } from '@/components/site/product-card';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { CategorySidebar } from '@/components/site/category-sidebar';
import { Pagination } from '@/components/site/pagination';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'สินค้าทั้งหมด | ครบจบทุกงานระบบที่ Home Tool Center',
  description: 'รวมสินค้าวัสดุก่อสร้างและอุปกรณ์ทุกงานระบบ — พีวีซี พีพีอาร์ พีอี ปั๊มน้ำ และอื่นๆ',
  alternates: { canonical: '/shop' },
};

type SearchParams = { page?: string; q?: string };

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10));
  const query = sp.q || '';
  const perPage = 16;
  const { items, total } = await listAllProducts({ page, perPage, query });
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Breadcrumb items={[{ label: 'หน้าหลัก', href: '/' }, { label: 'สินค้าทั้งหมด' }]} />

      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <CategorySidebar />
        <div>
          <h1 className="!text-2xl !text-[var(--color-fg)] md:!text-3xl">สินค้าทั้งหมด</h1>
          <form action="/shop" className="mt-4">
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="ค้นหาสินค้า..."
              className="h-10 w-full max-w-md rounded-md border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
            />
          </form>
          <p className="mt-4 text-sm text-[var(--color-muted-fg)]">
            {query ? `ผลการค้นหา "${query}" — ${total} รายการ` : `พบสินค้า ${total} รายการ`}
          </p>

          {items.length === 0 ? (
            <p className="mt-10 text-center text-[var(--color-muted-fg)]">ไม่พบสินค้า</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            baseUrl={query ? `/shop?q=${encodeURIComponent(query)}` : '/shop'}
          />
        </div>
      </div>
    </div>
  );
}
