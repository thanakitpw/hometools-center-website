import { createClient } from '@/lib/supabase/server';
import CategoryForm from '../category-form';

export const dynamic = 'force-dynamic';

export default async function NewCategoryPage() {
  const s = await createClient();
  const { data: parents } = await s.from('categories').select('id, name_th').order('name_th');
  return (
    <CategoryForm
      value={{ id: null, slug: '', name_th: '', name_en: null, parent_id: null, description: null, banner_image_url: null, seo_title: null, seo_description: null, sort_order: 0, is_published: true }}
      parents={parents ?? []}
    />
  );
}
