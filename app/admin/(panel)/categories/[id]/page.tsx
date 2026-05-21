import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CategoryForm from '../category-form';

export const dynamic = 'force-dynamic';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: c }, { data: parents }] = await Promise.all([
    s.from('categories').select('*').eq('id', id).single(),
    s.from('categories').select('id, name_th').order('name_th'),
  ]);
  if (!c) notFound();
  return <CategoryForm value={{
    id: c.id, slug: c.slug, name_th: c.name_th, name_en: c.name_en,
    parent_id: c.parent_id, description: c.description, banner_image_url: c.banner_image_url,
    seo_title: c.seo_title, seo_description: c.seo_description,
    sort_order: c.sort_order, is_published: c.is_published,
  }} parents={parents ?? []} />;
}
