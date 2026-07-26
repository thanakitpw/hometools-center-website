import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { FloatingContact } from '@/components/site/floating-contact';
import { RouteProgress } from '@/components/site/route-progress';
import { SmoothScroll } from '@/components/site/smooth-scroll';
import { Analytics, AnalyticsNoScript } from '@/components/site/analytics';
import { Toaster } from '@/components/ui/sonner';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsNoScript />
      <Analytics />
      <SmoothScroll />
      <RouteProgress />
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter />
      <FloatingContact />
      <Toaster position="top-center" richColors />
    </>
  );
}
