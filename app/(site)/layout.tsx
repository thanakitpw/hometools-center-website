import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { FloatingContact } from '@/components/site/floating-contact';
import { Toaster } from '@/components/ui/sonner';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter />
      <FloatingContact />
      <Toaster position="top-center" richColors />
    </>
  );
}
