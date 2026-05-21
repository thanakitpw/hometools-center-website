import { createClient } from '@/lib/supabase/server';
import PostForm from '../post-form';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  const s = await createClient();
  const { data: categories } = await s.from('categories').select('id, name_th').order('name_th');
  return (
    <PostForm
      value={{ id: null, slug: '', title: '', excerpt: null, content_md: null, cover_image_url: null, author: null, tags: [], category_id: null, seo_title: null, seo_description: null, og_image_url: null, status: 'draft' }}
      categories={categories ?? []}
    />
  );
}
