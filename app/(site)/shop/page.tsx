import type { Metadata } from 'next';
import { listAllProducts } from '@/lib/queries/products';
import { ProductCard } from '@/components/site/product-card';
import { CategorySidebar } from '@/components/site/category-sidebar';
import { Pagination } from '@/components/site/pagination';
import { homeImg as img } from '@/lib/home-assets';
import { Search } from 'lucide-react';

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
    <>
      <section className="bg-white">
        <div className="w-full pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.heroToa}
            alt="โฮมทูล เซ็นเตอร์ ครบเครื่องเรื่องท่อและอุปกรณ์ PVC"
            className="block w-full"
          />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-10">
          <h1 className="text-center !text-[40px] !font-bold !leading-tight !text-[#111111] md:!text-[46px]">
            สินค้าทั้งหมด
          </h1>

          <div className="mt-10 grid gap-8 md:grid-cols-[240px_1fr] lg:gap-10">
            <aside>
              <form action="/shop" className="mb-10 flex overflow-hidden rounded-full bg-white shadow-[0_8px_24px_rgba(0,72,145,0.12)]">
                <div className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-l-full border border-r-0 border-[#dce8f8] px-5">
                  <Search className="h-5 w-5 shrink-0 text-[#b5c7dd]" />
                  <input
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="ค้นหาสินค้า"
                    className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#b7c0cc]"
                  />
                </div>
                <button
                  type="submit"
                  className="h-[52px] w-[78px] shrink-0 rounded-r-full bg-[#004a7f] text-[15px] font-semibold text-white transition-colors hover:bg-[#0875d1]"
                >
                  ค้นหา
                </button>
              </form>
              <CategorySidebar />
            </aside>

            <div>
              {query && (
                <p className="mb-5 text-sm text-[var(--color-muted-fg)]">
                  ผลการค้นหา "{query}" - {total} รายการ
                </p>
              )}

              {items.length === 0 ? (
                <p className="mt-10 text-center text-[var(--color-muted-fg)]">ไม่พบสินค้า</p>
              ) : (
                <div className="grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>
    </>
  );
}
