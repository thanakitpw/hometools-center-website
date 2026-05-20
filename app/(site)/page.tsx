import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';

const WP = 'https://jwyvdngiccmjhcwlmyql.supabase.co/storage/v1/object/public/media';

// Note: all images sourced from WP for now — will migrate to Supabase Storage in Phase 5
// Using <img> + loading="lazy" instead of next/image to avoid optimization issues with WP URLs
// containing @ characters and external domain hot-linking.

const heroBanners = [
  `${WP}/2022/10/BannerHTC1-2x-100.jpg`,
  `${WP}/2022/10/BannerHTC2.1-2x-8.png`,
];

const categoryIcons = [
  { src: `${WP}/2022/10/u-b617fc3e2509.svg`, label: 'ศูนย์รวมงานระบบ', href: '/product-category/system-work' },
  { src: `${WP}/2022/10/u-837d695a47d2.svg`, label: 'ท่อประปา', href: '/product-category/system-work' },
  { src: `${WP}/2022/10/u-41fb1fd991eb.svg`, label: 'ไฟฟ้า', href: '/product-category/construction-materials-and-equipment' },
  { src: `${WP}/2022/10/u-207fd850044a.svg`, label: 'สีทาบ้าน', href: '/product-category/construction-materials-and-equipment' },
  { src: `${WP}/2022/10/u-99a807ad0ad1.svg`, label: 'วัสดุอุปกรณ์ก่อสร้าง', href: '/product-category/construction-materials-and-equipment' },
];

const productPreviews = [
  `${WP}/2022/10/302253633_1168434623749685_5381682676231461706_n.jpeg`,
  `${WP}/2022/10/302290729_1168434773749670_1671744898345197979_n.jpeg`,
  `${WP}/2022/10/302141431_1168434680416346_1004699942770050217_n.jpeg`,
  `${WP}/2022/10/302300547_1168434383749709_1329853759847181346_n.jpeg`,
];

const promoBanners = [
  { src: `${WP}/2022/10/u-3c4bb87f64da.jpg`, alt: 'โปรโมชั่นเปิดร้านใหม่', href: '/promotion' },
  { src: `${WP}/2022/11/Promotion-Shipping-Free-4x-100.jpg`, alt: 'โปรโมชั่นจัดส่งฟรี', href: '/promotion' },
];

const blogTeasers = [
  { src: `${WP}/2023/11/u-336a72892d4c.jpg`, title: 'ระบบน้ำประปาภายในบ้าน', href: '/blog/home-water-supply-system' },
  { src: `${WP}/2023/11/u-c962d92aacc5.jpg`, title: 'ประเภทท่อในระบบสุขาภิบาล', href: '/blog/sanitary-pipe-types' },
  { src: `${WP}/2023/11/u-981d894a3587.jpg`, title: 'ท่อประปารั่วใต้พื้นบ้าน', href: '/blog/underground-water-pipe-leak' },
];

const partners = [
  { src: `${WP}/2022/10/LOGO_AP-2x-100-scaled.jpg`, alt: 'TOA' },
  { src: `${WP}/2022/10/LOGO_SSR-2x-100-scaled.jpg`, alt: 'SCG' },
  { src: `${WP}/2022/10/LOGO_PS-2x-100-1024x784.jpg`, alt: 'PS' },
  { src: `${WP}/2022/10/LOGO_PP-2x-100-1024x784.jpg`, alt: 'PP' },
  { src: `${WP}/2022/10/LOGO_SC-2x-100-1024x784.jpg`, alt: 'SC' },
  { src: `${WP}/2022/10/LOGO_AND-2x-100-1024x784.jpg`, alt: 'AND' },
  { src: `${WP}/2022/10/LOGO_LH-2x-100-1024x784.jpg`, alt: 'LH' },
];

export default function HomePage() {
  return (
    <>
      {/* ========== HERO ========== */}
      <section className="relative bg-[var(--color-brand-500)]">
        <img
          src={heroBanners[0]}
          alt="ครบเครื่องเรื่องท่อ"
          className="block w-full"
        />
      </section>

      {/* ========== Intro ========== */}
      <section className="mx-auto max-w-7xl px-6 py-12 text-center">
        <h2 className="!text-[var(--color-brand-light)]">
          สินค้าวัสดุและอุปกรณ์ก่อสร้างครบครัน
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-[var(--color-body)]">
          ศูนย์รวมวัสดุก่อสร้างครบวงจร โฮมทูล เซ็นเตอร์ คัดสรรและเป็นร้านตัวแทนจำหน่ายผลิตภัณฑ์
          วัสดุก่อสร้างคุณภาพดี จากผู้ผลิตชั้นนำ พร้อมบริการจัดส่งทั่วประเทศ
        </p>

        {/* Product previews grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {productPreviews.map((src, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
              <img src={src} alt={`สินค้า ${i + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-500)] hover:underline">
            ดูทั้งหมด <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ========== Category icons row ========== */}
      <section className="bg-[var(--color-muted)]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="text-center !text-[var(--color-brand-light)]">วัสดุก่อสร้าง และอุปกรณ์ก่อสร้าง</h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-[var(--color-body)]">
            ไม่ว่าจะเป็นงานโครงสร้าง งานตกแต่ง หรืออุปกรณ์ช่าง เรามีสินค้าวัสดุและอุปกรณ์ก่อสร้างคุณภาพดีจัดจำหน่าย
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {categoryIcons.map((c) => (
              <Link key={c.label} href={c.href as any} className="group flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-brand-500)] p-4 transition-transform group-hover:scale-105">
                  <img src={c.src} alt={c.label} className="h-full w-full object-contain invert" loading="lazy" />
                </div>
                <span className="mt-3 text-sm font-medium text-[var(--color-fg)]">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Promo banner ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <img src={`${WP}/2025/02/LINE_ALBUM_-big-campaign_250124_1-1.jpg`} alt="แคมเปญใหญ่" className="w-full rounded-lg" loading="lazy" />
        </div>
      </section>

      {/* ========== Promo cards ========== */}
      <section className="bg-[var(--color-muted)]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-6 md:grid-cols-2">
            {promoBanners.map((b) => (
              <Link key={b.src} href={b.href as any} className="block overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md">
                <img src={b.src} alt={b.alt} className="w-full" loading="lazy" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== About teaser ========== */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="!text-[var(--color-brand-light)]">
              โฮมทูล เซ็นเตอร์ ร้านขายวัสดุอุปกรณ์ก่อสร้างที่คุณวางใจ
            </h2>
            <p className="mt-4 text-lg italic text-[var(--color-accent-500)]">
              "ซื่อสัตย์นำพา ราคาโดนใจ แห่งเดียวครบจบไว ต้องไป โฮมทูล เซ็นเตอร์"
            </p>
            <p className="mt-4 text-[var(--color-body)]">
              ด้วยประสบการณ์กว่า 30 ปี การันตีด้วยผลงานมากมาย ทำให้โฮมทูล เซ็นเตอร์
              ก้าวขึ้นมาเป็นศูนย์รวมวัสดุก่อสร้างครบวงจรของประเทศ
            </p>
            <Link href="/about-us" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-500)] hover:underline">
              อ่านเพิ่มเติม <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <img src={`${WP}/2022/11/shutterstock_1653949195__1_-removebg.png`} alt="โฮมทูล เซ็นเตอร์" className="w-full" loading="lazy" /> {/* unchanged — no @ in filename */}
          </div>
        </div>
      </section>

      {/* ========== Blog teasers ========== */}
      <section className="bg-[var(--color-muted)]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="text-center !text-[var(--color-accent-500)]">ข่าวสารและบทความ</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {blogTeasers.map((b) => (
              <Link key={b.href} href={b.href as any} className="group overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={b.src} alt={b.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-brand-500)]">
                    {b.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-500)] hover:underline">
              ดูทั้งหมด <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========== CTA banner ========== */}
      <section className="bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-12 md:flex-row md:justify-between">
          <h2 className="!text-white">ส่งเร็ว ทันใจ สั่งของออนไลน์เลยตอนนี้</h2>
          <a
            href="tel:024262745"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-500)] px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-[var(--color-accent-600)]"
          >
            <Phone className="h-5 w-5" /> โทรเลย 02-426-2745
          </a>
        </div>
      </section>

      {/* ========== Brand partners ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="text-center !text-[var(--color-accent-500)]">พันธมิตรของเรา</h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-[var(--color-body)]">
            เราเป็นบริษัทผู้แทนจำหน่ายชั้นนำของประเทศ ที่ได้รับการการันตีด้วยรางวัลผู้แทนจำหน่ายดีเด่น
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {partners.map((p) => (
              <div key={p.src} className="flex items-center justify-center">
                <img src={p.src} alt={p.alt} className="h-16 w-auto object-contain grayscale transition-all hover:grayscale-0" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Map ========== */}
      <section className="bg-[var(--color-muted)]">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <iframe
            src="https://maps.google.com/maps?q=hometools-center.com&t=&z=15&ie=UTF8&iwloc=&output=embed"
            className="h-[400px] w-full rounded-lg border-0"
            loading="lazy"
            title="Home Tool Center location"
          />
        </div>
      </section>
    </>
  );
}
