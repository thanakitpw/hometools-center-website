import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { JsonLd } from '@/components/site/json-ld';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';

// Sukhumvit Set — matches the original hometools-center.com typography exactly.
// Self-hosted from the source site's own .ttf files.
const sukhumvit = localFont({
  src: [
    { path: './fonts/SukhumvitSet-Thin.ttf', weight: '100', style: 'normal' },
    { path: './fonts/SukhumvitSet-Light.ttf', weight: '300', style: 'normal' },
    { path: './fonts/SukhumvitSet-Text.ttf', weight: '400', style: 'normal' },
    { path: './fonts/SukhumvitSet-Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/SukhumvitSet-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './fonts/SukhumvitSet-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-thai',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hometools-center.com'),
  title: {
    default: 'ศูนย์รวมวัสดุก่อสร้างครบวงจร | ราคาโดนใจ ครบจบไวทุกงานระบบ',
    template: '%s | Home Tool Center',
  },
  description:
    'Home Tool Center ร้านขายวัสดุอุปกรณ์ก่อสร้างงานระบบชั้นนำ ประสบการณ์กว่า 30 ปี ศูนย์รวมสินค้าครบวงจร ทั้งงานประปา ไฟฟ้า สีทาบ้าน และอื่นๆ บริการรวดเร็ว สั่งเลย!',
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    siteName: 'Home Tool Center',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sukhumvit.variable}>
      <body>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        {children}
      </body>
    </html>
  );
}
