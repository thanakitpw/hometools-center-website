import { createClient } from '@/lib/supabase/server';
import ProductForm from '../product-form';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const s = await createClient();
  const [{ data: brands }, { data: categories }] = await Promise.all([
    s.from('brands').select('id, name').order('name'),
    s.from('categories').select('id, name_th').order('name_th'),
  ]);

  return (
    <ProductForm
      value={{
        id: null,
        slug: '',
        sku: null,
        name_th: '',
        name_en: null,
        short_description: null,
        description_md: null,
        brand_id: null,
        primary_category_id: null,
        package_size: null,
        catalog_pdf_url: null,
        seo_title: null,
        seo_description: null,
        og_image_url: null,
        status: 'draft',
        sort_order: 0,
        images: [],
      }}
      brands={brands ?? []}
      categories={categories ?? []}
    />
  );
}
