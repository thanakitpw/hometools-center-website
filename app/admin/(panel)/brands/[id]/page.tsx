import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BrandForm from '../brand-form';

export const dynamic = 'force-dynamic';

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: brand } = await s.from('brands').select('*').eq('id', id).single();
  if (!brand) notFound();
  return <BrandForm value={{
    id: brand.id, slug: brand.slug, name: brand.name,
    logo_url: brand.logo_url, banner_url: brand.banner_url,
    description: brand.description, sort_order: brand.sort_order,
  }} />;
}
