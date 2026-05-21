'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  FileText,
  Mail,
  Inbox,
  Image as ImageIcon,
  ArrowLeftRight,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'สินค้า', icon: Package },
  { href: '/admin/categories', label: 'หมวดหมู่', icon: FolderTree },
  { href: '/admin/brands', label: 'แบรนด์', icon: Tag },
  { href: '/admin/posts', label: 'บทความ', icon: FileText },
  { href: '/admin/quotes', label: 'ใบเสนอราคา', icon: Inbox },
  { href: '/admin/messages', label: 'ข้อความติดต่อ', icon: Mail },
  { href: '/admin/media', label: 'รูปภาพ', icon: ImageIcon },
  { href: '/admin/redirects', label: 'Redirects', icon: ArrowLeftRight },
  { href: '/admin/settings', label: 'ตั้งค่า', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r bg-white">
      <div className="px-5 py-4 border-b">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--color-brand-500)]" />
          HTC Admin
        </Link>
      </div>
      <nav className="p-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
