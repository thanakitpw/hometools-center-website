import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '../product-form';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: product }, { data: brands }, { data: categories }] = await Promise.all([
    s.from('products').select('*').eq('id', id).single(),
    s.from('brands').select('id, name').order('name'),
    s.from('categories').select('id, name_th').order('name_th'),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      value={{
        id: product.id,
        slug: product.slug,
        sku: product.sku,
        name_th: product.name_th,
        name_en: product.name_en,
        short_description: product.short_description,
        description_md: product.description_md,
        brand_id: product.brand_id,
        primary_category_id: product.primary_category_id,
        package_size: product.package_size,
        catalog_pdf_url: product.catalog_pdf_url,
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        og_image_url: product.og_image_url,
        status: product.status,
        sort_order: product.sort_order,
        images: Array.isArray(product.images) ? product.images : [],
      }}
      brands={brands ?? []}
      categories={categories ?? []}
    />
  );
}
