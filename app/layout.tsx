import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';

const ibmPlexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
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
    <html lang="th" className={ibmPlexThai.variable}>
      <body>{children}</body>
    </html>
  );
}
