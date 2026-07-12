import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { homeImg as img } from '@/lib/home-assets';
import { HomeCarousel } from '@/components/site/home-carousel';
import { JsonLd } from '@/components/site/json-ld';
import { localBusinessSchema } from '@/lib/seo/schema';

const CAT = '/product-category';

/* ---------- data ---------- */

const quoteIcons = [
  { src: img.iconSystem, label: 'ศูนย์รวมงานระบบ', href: `${CAT}/system-work` },
  { src: img.iconPipe, label: 'ท่อประปา', href: `${CAT}/system-work` },
  { src: img.iconElectric, label: 'ไฟฟ้า', href: `${CAT}/construction-materials-and-equipment` },
  { src: img.iconPaint, label: 'สีทาบ้าน', href: `${CAT}/construction-materials-and-equipment/toa-color` },
  { src: img.iconMaterials, label: 'วัสดุอุปกรณ์ก่อสร้าง', href: `${CAT}/construction-materials-and-equipment` },
];

const categoryCards = [
  { src: img.catPvcScg, label: 'ท่อและอุปกรณ์ PVC (SCG)', href: `${CAT}/system-work/pvc-pipes-and-fittings-scg` },
  { src: img.catPvcThai, label: 'ท่อและอุปกรณ์ PVC (ท่อน้ำไทย)', href: `${CAT}/pvc-pipes-and-fittings-thaipipe` },
  { src: img.catPpr, label: 'ท่อและอุปกรณ์ PPR', href: `${CAT}/system-work/ppr-pipes-and-fittings` },
  { src: img.catPe, label: 'ท่อและอุปกรณ์ PE', href: `${CAT}/system-work/pe-pipes-and-fittings` },
  { src: img.catPb, label: 'ท่อและอุปกรณ์ PB', href: `${CAT}/system-work/pb-pipes-and-fittings` },
  { src: img.catPp, label: 'ท่อและอุปกรณ์ PP', href: `${CAT}/system-work/pp-pipes-and-fittings` },
  { src: img.catConduit, label: 'ท่อ CONDUIT', href: `${CAT}/system-work/conduit-pipe` },
  { src: img.catSteelPe, label: 'ท่อเหล็กบุ PE', href: `${CAT}/system-work/pe-lined-steel-pipe` },
  { src: img.catRubber, label: 'ท่อยางอุตสาหกรรม', href: `${CAT}/system-work/industrial-rubber-hose` },
  { src: img.catValve, label: 'มิเตอร์,ก็อก,ประตูน้ำ,ปั๊มน้ำ และ วาล์ว', href: `${CAT}/system-work/meters-taps-sluices-water-pumps-and-valves` },
  { src: img.catTank, label: 'แท๊งค์น้ำ', href: `${CAT}/system-work/water-tank` },
  { src: img.catManhole, label: 'แมนโฮล รูฟเดรน ฟอร์เดรน และอุปกรณ์อื่นๆ', href: `${CAT}/system-work/manhole-roof-drain-fordren-and-other-accessories` },
];

const bigCards = [
  { src: img.bigCardPaint, label: 'สีทาบ้าน TOA', href: `${CAT}/construction-materials-and-equipment/toa-color` },
  { src: img.bigCardTools, label: 'อุปกรณ์ก่อสร้างและอื่น ๆ', href: `${CAT}/construction-materials-and-equipment` },
];

const promoCards = [
  { src: img.promoToa, label: 'โปรโมชั่นซื้อสีทีโอเอ' },
  { src: img.promoNewStore, label: 'โปรโมชั่นสำหรับลูกค้าที่ต้องการเปิดร้านใหม่' },
  { src: img.promoShipping, label: 'โปรโมชั่นการจัดส่ง' },
];

const blogCards = [
  { src: img.blog1, title: 'ระบบน้ำประปาภายในบ้าน', href: '/blog/home-water-supply-system', excerpt: 'ระบบน้ำประปาภายในบ้านสามารถแบ่งออกเป็น 3 ประเภทหลักๆ คือ 1.ระบบจ่ายน้ำขึ้น เหมาะสำหรับอาคารหรือบ้านที่มีความสูงไม่เกิน 3 ชั้น โดยน้ำจะถูกจ่ายจากท่อประปาหลัก…' },
  { src: img.blog2, title: 'ประเภทท่อในระบบสุขาภิบาล', href: '/blog/sanitary-pipe-types', excerpt: 'งานระบบสุขาภิบาล ท่อถือเป็นองค์ประกอบสำคัญที่มีส่วนทำให้ระบบสุขาภิบาลทำงานได้อย่างสมบูรณ์ ในด้านการออกแบบ และการเลือกใช้วัสดุท่องานระบบสุขาภิบาล…' },
  { src: img.blog3, title: 'ท่อประปารั่วใต้พื้นบ้าน', href: '/blog/underground-water-pipe-leak', excerpt: 'สาเหตุที่ทำให้ท่อประปารั่วใต้พื้นบ้าน วิธีแก้ไขท่อประปารั่วใต้พื้นบ้าน สำหรับท่อประปาใต้ดิน หรือใต้บ้านนั้น ค่อนข้างยากที่จะตรวจสอบหรือพบเห็น…' },
];

const aboutColumns = [
  { title: 'ซื่อสัตย์นำพา', body: 'โฮมทูล เซ็นเตอร์ เป็นร้านขายวัสดุอุปกรณ์ก่อสร้างตัวแทนจำหน่ายรายใหญ่ ทำให้สามารถจำหน่ายสินค้าในราคาที่ถูก นอกจากราคาเราให้ความสำคัญกับงานบริการ เพื่อให้ลูกค้าทุกท่านเข้าถึงการบริการที่สะดวกและรวดเร็วที่สุด' },
  { title: 'ราคาโดนใจ', body: 'ด้วยประสบการณ์กว่า 30 ปี การันตีด้วยผลงานมากมาย ทำให้โฮมทูล เซ็นเตอร์ ก้าวขึ้นมาเป็นศูนย์รวมวัสดุก่อสร้างครบวงจร ผู้แทนจำหน่ายอันดับต้น ๆ ของประเทศ โดยมีความจริงใจและซื่อสัตย์ต่อลูกค้าทุกท่าน' },
  { title: 'ครบจบไว', body: 'โฮมทูล เซ็นเตอร์ เป็นตัวแทนจำหน่ายวัสดุและอุปกรณ์ก่อสร้างครบวงจร สะดวกสบายต่อลูกค้าที่ใช้บริการ ได้สินค้าครบตามความต้องการ มีบริการขนส่งทั่วไทยหลากหลายช่องทาง รวดเร็วทันใจ รับประกันการขนส่งไม่เกิน 7 วัน' },
];

const customers = [
  { src: img.custAp, alt: 'AP' },
  { src: img.custSansiri, alt: 'Sansiri' },
  { src: img.custPruksa, alt: 'Pruksa' },
  { src: img.custPropPerfect, alt: 'Property Perfect' },
  { src: img.custScAsset, alt: 'SC Asset' },
  { src: img.custAnanda, alt: 'Ananda Development' },
  { src: img.custLandHouses, alt: 'Land & Houses' },
];

/* ---------- small helpers ---------- */

function SeeAll({ href }: { href: string }) {
  return (
    <Link
      href={href as never}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-brand-light)] px-4 py-1.5 text-[15px] font-medium text-[var(--color-brand-light)] transition-colors hover:bg-[var(--color-brand-light)] hover:text-white"
    >
      ดูทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="!mb-0 !text-[25px] !font-semibold !leading-[1.3] !text-[var(--color-brand-light)]">{title}</h2>
      {href && <SeeAll href={href} />}
    </div>
  );
}

/* ---------- page ---------- */

export default function HomePage() {
  return (
    <>
      <JsonLd data={localBusinessSchema()} />
      {/* ========== 1. HERO ========== */}
      <section className="bg-[var(--color-brand-500)]">
        <HomeCarousel
          images={[img.heroToa, img.heroBanner1]}
          alt="โฮมทูล เซ็นเตอร์ — ศูนย์ผสมสีทีโอเอ ครบวงจร"
          ratio={1903 / 600}
          showArrows
          showDots
        />
      </section>

      {/* ========== 2. INTRO + ABOUT ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 py-14 md:py-16">
          <h1 className="mx-auto max-w-[940px] text-center text-[2rem] leading-snug md:text-[2.5rem]">
            บริษัท โฮมทูล เซ็นเตอร์ ศูนย์จำหน่ายวัสดุก่อสร้าง
            <br />
            และอุปกรณ์ก่อสร้าง ทุกงานระบบครบวงจร
          </h1>
          <p className="mx-auto mt-5 max-w-[980px] text-center text-[1rem] leading-7 text-[var(--color-muted-fg)]">
            โฮมทูล เซ็นเตอร์ คือ ร้านขายวัสดุอุปกรณ์ก่อสร้างชั้นนำที่ได้รับความไว้วางใจมานานกว่า 30 ปี
            เรามุ่งมั่นเป็นศูนย์รวมวัสดุก่อสร้างครบวงจร ที่ตอบโจทย์ทุกความต้องการสำหรับงานก่อสร้างและตกแต่ง
            ไม่ว่าจะเป็นโครงการขนาดเล็กหรือใหญ่ ด้วยผลิตภัณฑ์คุณภาพสูง บริการที่รวดเร็ว และราคาที่แข่งขันได้
            เราพร้อมเป็นคู่คิดสำหรับทุกโครงการของคุณ
          </p>

          <div className="mt-16 grid items-center gap-12 md:grid-cols-[488px_minmax(0,1fr)] lg:gap-[78px]">
            <div className="overflow-hidden rounded-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.aboutImg2}
                alt="ประสบการณ์งานระบบน้ำและงานประปาของโฮมทูล เซ็นเตอร์"
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="!mb-6 text-center !text-[1.875rem] !font-bold !text-[var(--color-brand-light)]">
                เกี่ยวกับเรา
              </h2>
              <p className="text-center text-[1.45rem] font-normal leading-relaxed text-[var(--color-muted-fg)]">
                บริษัท จำหน่ายวัสดุอุปกรณ์ก่อสร้าง
                <br />
                <span className="font-bold text-[var(--color-muted-fg)]">ทุกงานระบบ ครบวงจร</span>{' '}
                <span className="font-normal text-[var(--color-accent-500)]">ประสบการณ์มากกว่า 30 ปี</span>
              </p>
              <p className="mt-6 text-left text-[1rem] leading-8 text-[var(--color-muted-fg)]">
                ด้วยประสบการณ์ในการเป็นตัวแทนจำหน่ายที่มากกว่า 30 ปี ทำให้ปัจจุบัน โฮมทูล เซ็นเตอร์
                ได้ก้าวขึ้นมาเป็นตัวแทนจำหน่ายอันดับต้นๆ ของประเทศฯ เราคือธุรกิจที่จำหน่าย
                <Link href="https://www.facebook.com/hometoolscenter/" className="text-[var(--color-brand-500)]">
                  วัสดุก่อสร้าง
                </Link>{' '}
                และอุปกรณ์ก่อสร้างที่มีคุณภาพสูง ทางเรามีสินค้าที่หลากหลายให้เลือกสรรค์ตามความต้องการของลูกค้า ไม่ว่าจะเป็น{' '}
                <Link href="https://www.facebook.com/hometoolscenter/" className="text-[var(--color-brand-500)]">
                  ท่อ SCG
                </Link>{' '}
                <Link href={`${CAT}/system-work/pvc-pipes-and-fittings-scg` as never} className="text-[var(--color-brand-500)]">
                  ท่อ PVC
                </Link>{' '}
                ข้อต่อ PVC มิเตอร์,ก็อก,ประตูน้ำ,ปั๊มน้ำ และ วาล์ว หรือวัสดุก่อสร้างอื่นๆ
              </p>
              <p className="mt-6 text-left text-[1rem] leading-8 text-[var(--color-muted-fg)]">
                การันตีด้วยรางวัลผู้แทนจำหน่ายวัสดุก่อสร้างยอดเยี่ยมจากหลากหลายแบรนด์ โดยโฮมทูล เซ็นเตอร์
                ได้รับการไว้วางใจจากลูกค้าที่มากมาย ไม่ว่าจะเป็นโครงการใหญ่ไปถึงโครงการเล็กทุกโครงการทั่วประเทศฯ
                เราสามารถตอบสนองต่อความต้องการของลูกค้าได้อย่างมีประสิทธิภาพ โฮมทูล เซ็นเตอร์ เป็นผู้แทนจำหน่ายที่
                จำหน่ายสินค้าผ่านภายใต้แนวคิดที่ว่า
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 3. QUOTE + ICONS BAND ========== */}
      <section className="bg-white pb-14">
        <div className="mx-auto max-w-[1140px] px-6">
          <div
            className="flex min-h-[267px] flex-col justify-center overflow-hidden rounded-[10px] bg-[var(--color-brand-500)] bg-cover bg-center px-6 py-9 text-white"
            style={{ backgroundImage: `url(${img.quoteBandBg})` }}
          >
            <p className="text-center text-[22px] font-semibold leading-relaxed text-white md:text-[24px]">
              “ ซื่อสัตย์นำพา...ราคาโดนใจ...แห่งเดียวครบจบไว...ต้องไป{' '}
              <span className="text-[#ffbb87]">โฮมทูล เซ็นเตอร์</span> ”
            </p>
            <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-12">
              {quoteIcons.map((c) => (
                <Link
                  key={c.label}
                  href={c.href as never}
                  className="group flex flex-col items-center text-center text-white hover:text-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src} alt={c.label} className="h-[58px] w-[58px] object-contain brightness-0 invert transition-transform group-hover:scale-110" loading="lazy" />
                  <span className="mt-4 max-w-[120px] text-[16px] font-medium leading-snug text-white">{c.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 4. PRODUCT INTRO ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 pt-9">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="!text-[30px] !font-semibold !leading-[1.3] !text-[var(--color-brand-light)]">อุปกรณ์และ ท่อPVC</h2>
              <p className="mt-5 max-w-[760px] text-[16px] leading-[1.65] text-[#606060]">
                เราเป็นตัวแทนจำหน่าย ท่อ PVC SCG และอุปกรณ์ระบบประปาคุณภาพสูง อาทิเช่น{' '}
                <Link href={`${CAT}/system-work/pvc-pipes-and-fittings-scg` as never} className="text-[var(--color-brand-500)]">
                  ท่อ PVC
                </Link>
                ,{' '}
                <Link href={`${CAT}/system-work/ppr-pipes-and-fittings` as never} className="text-[var(--color-brand-500)]">
                  ท่อ PPR
                </Link>
                , ปั๊มน้ำ และอุปกรณ์เสริมครบครันสำหรับทุกโครงการของคุณ
              </p>
            </div>
            <SeeAll href="/shop" />
          </div>
          <div className="mt-8 border-t border-[#b8d6ff]" />
        </div>
      </section>

      {/* ========== 5. CATEGORY CARDS ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 pb-14 pt-6">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-7">
            {categoryCards.map((c) => (
              <Link
                key={c.label}
                href={c.href as never}
                className="group flex flex-col overflow-hidden rounded-[16px] border-2 border-[#e4e4e4] bg-white transition-shadow hover:shadow-lg"
              >
                <div className="flex h-[205px] items-center justify-center bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src} alt={c.label} className="max-h-[188px] max-w-full object-contain transition-transform group-hover:scale-105" loading="lazy" />
                </div>
                <div className="flex h-[92px] items-center justify-center px-5 py-4 text-center">
                  <span className="text-[18px] font-bold leading-snug text-[#4b4f58]">{c.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 6. TOA COLOR CENTER ========== */}
      <section
        className="mt-10 overflow-visible bg-[#f3f3f3] bg-cover bg-center md:mt-12"
        style={{ backgroundImage: `url(${img.toaFanBg})` }}
      >
        <div className="relative mx-auto grid min-h-[395px] max-w-[1298px] items-center gap-8 overflow-visible px-6 py-12 md:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] md:py-12">
          <div className="relative z-10 md:pl-[54px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.toaLogo} alt="TOA" className="h-[74px] w-auto object-contain" loading="lazy" />
            <h2 className="mt-10 max-w-[860px] !text-[38px] !font-semibold !leading-[1.18] !tracking-[0.2px] !text-[#3769cc] md:whitespace-nowrap md:!text-[48px] lg:!text-[54px]">
              ศูนย์ผสมสีทีโอเอครบวงจร
            </h2>
            <p className="mt-6 max-w-[850px] text-[16px] leading-[1.65] text-[#606060]">
              เราเป็น
              <Link href={`${CAT}/construction-materials-and-equipment/toa-color` as never} className="text-[var(--color-brand-500)]">
                ตัวแทนจำหน่ายสี TOA
              </Link>{' '}
              พร้อมศูนย์บริการผสมสีครบวงจร ครบครันทั้งผลิตภัณฑ์สีและเคมีภัณฑ์ มีทีมผู้เชี่ยวชาญให้คำปรึกษา
              เพื่อเนรมิตทุกเฉดสีตามความต้องการ ให้งานสีของคุณสวยงามและทนทานได้อย่างใจ
            </p>
            <div className="mt-12">
              <SeeAll href={`${CAT}/construction-materials-and-equipment/toa-color`} />
            </div>
          </div>
          <div className="relative flex min-h-[280px] items-end justify-center md:min-h-[395px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.toaFan}
              alt="พัดสี TOA"
              className="relative z-10 -mb-6 w-[min(78vw,420px)] max-w-none object-contain md:absolute md:right-[52px] md:top-[-111px] md:w-[420px] lg:right-[86px] lg:top-[-111px] lg:w-[450px]"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ========== 7. MATERIALS — 2 BIG CARDS ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 py-14">
          <SectionHead title="วัสดุก่อสร้าง และอุปกรณ์ก่อสร้าง" href="/shop" />
          <p className="-mt-4 mb-8 max-w-4xl text-[16px] leading-[1.65] text-[#606060]">
            ไม่ว่าจะเป็นงานโครงสร้าง งานตกแต่ง หรืออุปกรณ์ช่าง เรามีสินค้าวัสดุและอุปกรณ์ก่อสร้างคุณภาพสูง
            พร้อมให้คุณเลือกสรร จบทุกความต้องการในที่เดียว
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {bigCards.map((c) => (
              <Link key={c.label} href={c.href as never} className="group overflow-hidden rounded-xl bg-[#eef4fb] transition-shadow hover:shadow-lg">
                <div className="flex h-56 items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src} alt={c.label} className="max-h-full w-auto object-contain transition-transform group-hover:scale-105" loading="lazy" />
                </div>
                <div className="bg-white/60 py-4 text-center">
                  <span className="text-[18px] font-semibold text-[var(--color-brand-light)]">{c.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 8. PROMOTIONS ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 pb-14">
          <SectionHead title="โปรโมชั่น" href="/promotion" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {promoCards.map((p) => (
              <Link key={p.label} href="/promotion" className="group block">
                <div className="overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.label} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                </div>
                <p className="mt-3 text-center text-[16px] font-medium text-[#606060]">{p.label}</p>
              </Link>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-4xl space-y-3 text-sm leading-relaxed text-[var(--color-body)]">
            <p className="font-semibold text-[var(--color-fg)]">
              โปรโมชั่นมาแรง !!! ทางบริษัทได้จัดกิจกรรมดี ๆ โปรโมชั่นพิเศษที่ชวนคุณมาซื้อสินค้ากับเราในราคาที่ยิ่งใหญ่กว่าเดิม นี่คือโปรโมชั่นที่คุณไม่ควรพลาด :
            </p>
            <p><b>1. สะสมแต้มแลกรางวัล</b> : เพื่อเพิ่มความพึงพอใจในการซื้อสินค้า เรากำลังมีโปรโมชั่นของแถมพิเศษ ที่จะเพิ่มมูลค่าให้กับการซื้อของคุณ ทุก ๆ บาทที่คุณซื้อกับเราสามารถสะสมแต้มเพื่อเปลี่ยนเป็นรางวัล</p>
            <p><b>2. โปรโมชั่นน้องใหม่</b> : สำหรับลูกค้าที่ต้องการเปิดร้านใหม่กับบริษัท โฮมทูล เซ็นเตอร์ ยินดีให้คำปรึกษาพร้อมให้ส่วนลดพิเศษที่สุด พร้อมของรางวัลอีกมากมาย</p>
            <p><b>3. ฟรีขนส่งทั่วไทย</b> : เมื่อมียอดการสั่งซื้อขั้นต่ำถึง 10,000 บาท เราจะให้บริการจัดส่งฟรีถึงที่อยู่ที่คุณต้องการ เพื่อความสะดวกและประหยัดของคุณ !!!</p>
          </div>
        </div>
      </section>

      {/* ========== 9. BLOG ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 pb-14">
          <SectionHead title="บทความที่น่าสนใจ" href="/blog" />
          <div className="grid gap-6 md:grid-cols-3">
            {blogCards.map((b) => (
              <Link key={b.href} href={b.href as never} className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white transition-shadow hover:shadow-lg">
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.src} alt={b.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[18px] font-semibold !text-[#0d398f] group-hover:underline">{b.title}</h3>
                  <p className="mt-2 line-clamp-3 text-[15px] leading-[1.6] text-[#606060]">{b.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 10. ABOUT BRAND BAND ========== */}
      <section
        className="bg-[var(--color-brand-500)] bg-cover bg-center text-white"
        style={{ backgroundImage: `url(${img.aboutBandBg})` }}
      >
        <div className="mx-auto grid max-w-[1140px] items-end gap-8 px-6 pt-12 md:grid-cols-[0.8fr_1.2fr]">
          <div className="flex justify-center md:justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.deliveryMan} alt="โฮมทูล เซ็นเตอร์" className="max-h-[420px] w-auto object-contain" loading="lazy" />
          </div>
          <div className="pb-12">
            <h2 className="!text-[28px] !font-medium !leading-[1.3] !text-white">โฮมทูล เซ็นเตอร์ ร้านขายวัสดุอุปกรณ์ก่อสร้างที่คุณวางใจ</h2>
            <p className="mt-3 text-lg font-medium">
              “ ซื่อสัตย์นำพา...ราคาโดนใจ...แห่งเดียวครบจบไว...ต้องไป{' '}
              <span className="text-[var(--color-accent-500)]">โฮมทูล เซ็นเตอร์</span> ”
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {aboutColumns.map((col) => (
                <div key={col.title}>
                  <h4 className="!text-[22px] !font-normal !text-white">{col.title}</h4>
                  <p className="mt-2 text-[15px] leading-[1.6] text-white/90">{col.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 11. CUSTOMERS ========== */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 py-14">
          <h2 className="text-center !text-[25px] !font-medium !leading-[1.3] !text-[var(--color-brand-light)]">ลูกค้าของเรา</h2>
          <p className="mx-auto mt-3 max-w-4xl text-center text-[16px] leading-[1.65] text-[#606060]">
            เนื่องจากบริษัท โฮมทูล เซ็นเตอร์ เป็นบริษัทผู้แทนจำหน่ายชั้นนำของประเทศที่ได้รับการการันตีด้วยรางวัลผู้แทนจำหน่ายยอดเยี่ยม
            จึงทำให้เราได้เป็นส่วนหนึ่งในการส่งสินค้าให้กับบริษัทอื่น ๆ มากมาย ไม่ว่าจะเป็นงานอาคารสูง หมู่บ้าน หรือสิ่งก่อสร้างโครงการต่าง ๆ
            ทุกงานระบบสามารถจบได้ที่ โฮมทูล เซ็นเตอร์
          </p>
          <div className="mt-10 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {customers.map((c) => (
              <div key={c.alt} className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt={c.alt} className="max-h-20 w-auto object-contain" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 12. CTA BAND ========== */}
      <section className="bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-light)] text-white">
        <div className="mx-auto flex max-w-[1140px] flex-col items-center gap-4 px-6 py-12 text-center">
          <h2 className="!text-[30px] !font-medium !leading-[1.3] !text-white">มองหาร้านขายวัสดุอุปกรณ์ก่อสร้างที่ครบวงจรและเชื่อถือได้?</h2>
          <p className="max-w-2xl text-[16px] text-white/90">
            ให้ โฮมทูล เซ็นเตอร์ เป็นตัวเลือกแรกของคุณ! ติดต่อเราวันนี้เพื่อรับคำปรึกษาและใบเสนอราคาพิเศษ
          </p>
          <Link
            href="/contact-us"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-base font-semibold text-[var(--color-brand-500)] shadow-md transition hover:bg-white/90"
          >
            ติดต่อเรา <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ========== 13. MAP ========== */}
      <section className="bg-white">
        <iframe
          src="https://www.google.com/maps?q=โฮมทูล+เซ็นเตอร์+พระราม+2&t=&z=15&ie=UTF8&iwloc=&output=embed"
          className="h-[420px] w-full border-0"
          loading="lazy"
          title="Home Tool Center location"
        />
      </section>
    </>
  );
}
