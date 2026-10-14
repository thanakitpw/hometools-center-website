import type { Metadata } from 'next';
import { ChevronRight, CreditCard, Truck, ClipboardList } from 'lucide-react';
import { getStaticPage } from '@/lib/static-pages';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { ContactForm } from '@/components/site/contact-form';
import { siteConfig } from '@/lib/site-config';

const SLUG = 'how-to-place-an-order';
const MEDIA = 'https://dwogyznhmveltanehaya.supabase.co/storage/v1/object/public/media/';

// Copy and artwork come from the old WordPress page (research/data/static-pages.json), laid out by
// hand here because the generic PageRenderer stacked every image full-width down a single column.
// Contact details are read from siteConfig, not the WP copy — its phone number is out of date.
const channels = [
  {
    title: 'แอดไลน์ผ่าน QR Code',
    detail: 'สแกน QR Code หรือกดปุ่มด้านล่าง แล้วส่งรายการสินค้าที่ต้องการมาทางแชต',
    icon: `${MEDIA}2022/11/Howtoorder1@3x-8.png`,
    iconAlt: 'QR Code LINE Official Account โฮมทูล เซ็นเตอร์',
    cta: { label: 'เพิ่มเพื่อนใน LINE', href: siteConfig.social.line, external: true },
  },
  {
    title: 'ติดต่อผ่านอีเมล',
    detail: siteConfig.contact.email,
    icon: `${MEDIA}2022/11/Howtoorder2@3x-8.png`,
    iconAlt: '',
    cta: { label: 'ส่งอีเมล', href: `mailto:${siteConfig.contact.email}`, external: false },
  },
  {
    title: 'โทรหาเรา',
    detail: `${siteConfig.contact.phone} (${siteConfig.contact.hours})`,
    icon: `${MEDIA}2022/11/Howtoorder3@3x-8.png`,
    iconAlt: '',
    cta: { label: `โทร ${siteConfig.contact.phone}`, href: `tel:${siteConfig.contact.phone.replace(/-/g, '')}`, external: false },
  },
  {
    title: 'กรอกข้อมูลผ่านเว็บไซต์',
    detail: 'ขอใบเสนอราคาได้จากหน้าสินค้า หรือกรอกแบบฟอร์มสั่งซื้อท้ายหน้านี้',
    icon: `${MEDIA}2022/11/Howtooder4@3x-8.png`,
    iconAlt: '',
    cta: { label: 'ไปที่แบบฟอร์ม', href: '#order-form', external: false },
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const p = getStaticPage(SLUG);
  return {
    title: p?.title || 'วิธีการสั่งซื้อ',
    description: p?.seo_description || undefined,
    alternates: { canonical: `/${SLUG}` },
  };
}

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: typeof CreditCard; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-500)]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold tracking-wider text-[var(--color-accent-500)] uppercase">{eyebrow}</p>
        <h2 className="!text-xl !text-[var(--color-fg)] md:!text-2xl">{title}</h2>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumb items={[{ label: 'หน้าหลัก', href: '/' }, { label: 'วิธีการสั่งซื้อ' }]} />

      <header className="mt-6 max-w-3xl">
        <p className="text-sm font-semibold tracking-wider text-[var(--color-accent-500)] uppercase">How to order</p>
        <h1 className="mt-1 !text-3xl !text-[var(--color-fg)] md:!text-4xl">วิธีสั่งซื้อสินค้า</h1>
        <p className="mt-4 leading-relaxed text-[var(--color-body)]">
          โฮมทูล เซ็นเตอร์ คำนึงถึงการสั่งซื้อสินค้าที่สะดวกสบายและเข้าถึงง่ายต่อลูกค้าทุกท่าน
          สั่งซื้อกับเราได้หลายช่องทาง ทั้ง LINE, อีเมล, โทรศัพท์ หรือกรอกข้อมูลผ่านเว็บไซต์
          หลังจากได้รับข้อมูลแล้ว ทางเราจะรีบดำเนินการให้เร็วที่สุด
        </p>
      </header>

      {/* Order channels */}
      <section className="mt-10" aria-labelledby="channels-heading">
        <h2 id="channels-heading" className="sr-only">ช่องทางการสั่งซื้อ</h2>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((c, i) => (
            <li
              key={c.title}
              className="relative flex flex-col items-center rounded-2xl border border-[var(--color-border)] bg-white p-6 text-center shadow-sm"
            >
              <span className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-500)] text-sm font-bold text-white">
                {i + 1}
              </span>
              <img
                src={c.icon}
                alt={c.iconAlt}
                width={598}
                height={605}
                loading="lazy"
                className={i === 0 ? 'h-36 w-36' : 'h-24 w-24 mt-6 mb-6'}
              />
              <h3 className="mt-4 !text-lg !text-[var(--color-fg)]">{c.title}</h3>
              <p className="mt-1 text-sm break-words text-[var(--color-muted-fg)]">{c.detail}</p>
              <div className="flex-1" />
              <a
                href={c.cta.href}
                {...(c.cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)]"
              >
                {c.cta.label}
              </a>
              {i < channels.length - 1 && (
                <ChevronRight
                  aria-hidden
                  className="absolute top-1/2 -right-[18px] z-10 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-[var(--color-brand-50)] p-1.5 text-[var(--color-brand-500)] lg:block"
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-14 grid gap-8 md:grid-cols-2">
        {/* Payment */}
        <section id="payment" className="scroll-mt-28 rounded-2xl border border-[var(--color-border)] bg-white p-6">
          <SectionHeading icon={CreditCard} eyebrow="Payment" title="วิธีการชำระเงิน" />
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <img
              src={`${MEDIA}u-63cdaa075d2d.jpg`}
              alt="บัญชีธนาคารกรุงเทพ บริษัท โฮมทูล เซ็นเตอร์ จำกัด เลขที่บัญชี 235-302283-9"
              width={592}
              height={676}
              loading="lazy"
              className="w-44 shrink-0 rounded-xl"
            />
            <dl className="w-full space-y-3 text-sm">
              <div>
                <dt className="text-[var(--color-muted-fg)]">ธนาคาร</dt>
                <dd className="font-medium text-[var(--color-fg)]">ธนาคารกรุงเทพ สาขาถนนประชาอุทิศราษฎร์บูรณะ</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-fg)]">ชื่อบัญชี</dt>
                <dd className="font-medium text-[var(--color-fg)]">บริษัท โฮมทูล เซ็นเตอร์ จำกัด</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-fg)]">เลขที่บัญชี</dt>
                <dd className="text-xl font-bold tracking-wide text-[var(--color-brand-500)] tabular-nums">235-302283-9</dd>
              </div>
            </dl>
          </div>
          <p className="mt-6 rounded-lg bg-[var(--color-brand-50)] px-4 py-3 text-sm text-[var(--color-brand-700)]">
            เมื่อชำระเงินแล้ว กรุณาส่งสลิปยืนยันผ่านทาง LINE หรืออีเมลของบริษัท
          </p>
        </section>

        {/* Shipping */}
        <section id="shipping" className="scroll-mt-28 rounded-2xl border border-[var(--color-border)] bg-white p-6">
          <SectionHeading icon={Truck} eyebrow="Shipping" title="การขนส่งสินค้า" />
          <p className="mt-6 text-sm text-[var(--color-body)]">
            จัดส่งด้วยรถของทางบริษัทฯ และบริษัทขนส่งเอกชน
          </p>
          <img
            src={`${MEDIA}u-407aa3f4bd99.png`}
            alt="SCG Express, Kerry Express และไปรษณีย์ไทย"
            width={1448}
            height={479}
            loading="lazy"
            className="mt-6 w-full max-w-md"
          />
        </section>
      </div>

      {/* Order form */}
      <section id="order-form" className="mt-14 scroll-mt-28 rounded-2xl border border-[var(--color-border)] bg-white p-6 md:p-8">
        <SectionHeading icon={ClipboardList} eyebrow="Order form" title="แบบฟอร์มสั่งซื้อสินค้า" />
        <p className="mt-4 text-sm text-[var(--color-muted-fg)]">
          ระบุรายละเอียดสินค้า จำนวน และหน่วยให้ชัดเจน แล้วทางเราจะติดต่อกลับโดยเร็วที่สุด
        </p>
        <div className="mt-6 max-w-2xl">
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
