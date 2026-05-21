import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Package, FolderTree, FileText, Inbox, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getCounts() {
  const s = await createClient();
  const [products, categories, posts, quotesNew, messagesNew] = await Promise.all([
    s.from('products').select('id', { count: 'exact', head: true }),
    s.from('categories').select('id', { count: 'exact', head: true }),
    s.from('posts').select('id', { count: 'exact', head: true }),
    s.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    s.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);
  return {
    products: products.count ?? 0,
    categories: categories.count ?? 0,
    posts: posts.count ?? 0,
    quotesNew: quotesNew.count ?? 0,
    messagesNew: messagesNew.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const c = await getCounts();
  const cards = [
    { href: '/admin/products', label: 'สินค้า', value: c.products, icon: Package },
    { href: '/admin/categories', label: 'หมวดหมู่', value: c.categories, icon: FolderTree },
    { href: '/admin/posts', label: 'บทความ', value: c.posts, icon: FileText },
    { href: '/admin/quotes', label: 'ใบเสนอราคาใหม่', value: c.quotesNew, icon: Inbox, highlight: c.quotesNew > 0 },
    { href: '/admin/messages', label: 'ข้อความใหม่', value: c.messagesNew, icon: Mail, highlight: c.messagesNew > 0 },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ภาพรวม</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ href, label, value, icon: Icon, highlight }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border rounded-xl p-5 hover:shadow-sm transition flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm">{label}</span>
              <Icon className="w-4 h-4" />
            </div>
            <div className={`text-3xl font-semibold ${highlight ? 'text-[color:var(--color-accent-500)]' : ''}`}>
              {value.toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
