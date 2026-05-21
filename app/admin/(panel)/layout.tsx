import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import AdminSidebar from '@/components/admin/sidebar';
import AdminTopbar from '@/components/admin/topbar';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="min-h-svh flex bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
