import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: { default: 'Admin — Home Tool Center', template: '%s — HTC Admin' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
