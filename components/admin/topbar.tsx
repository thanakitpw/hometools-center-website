import { logoutAction } from '@/app/admin/login/actions';
import { Button } from '@/components/ui/button';
import { LogOut, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { AdminUser } from '@/lib/auth';

export default function AdminTopbar({ user }: { user: AdminUser }) {
  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6">
      <div className="text-sm text-slate-500">
        ระบบจัดการ Home Tool Center
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          ดูเว็บไซต์ <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <div className="text-sm">
          <span className="text-slate-500">{user.role}</span>{' '}
          <span className="font-medium">{user.display_name ?? user.email}</span>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-1" /> ออกจากระบบ
          </Button>
        </form>
      </div>
    </header>
  );
}
