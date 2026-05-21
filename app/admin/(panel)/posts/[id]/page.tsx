import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PostForm from '../post-form';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: p }, { data: categories }] = await Promise.all([
    s.from('posts').select('*').eq('id', id).single(),
    s.from('categories').select('id, name_th').order('name_th'),
  ]);
  if (!p) notFound();
  return <PostForm value={{
    id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt,
    content_md: p.content_md, cover_image_url: p.cover_image_url, author: p.author,
    tags: Array.isArray(p.tags) ? p.tags : [], category_id: p.category_id,
    seo_title: p.seo_title, seo_description: p.seo_description, og_image_url: p.og_image_url,
    status: p.status,
  }} categories={categories ?? []} />;
}
