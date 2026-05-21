import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RedirectForm from '../redirect-form';

export const dynamic = 'force-dynamic';

export default async function EditRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: r } = await s.from('redirects').select('*').eq('id', id).single();
  if (!r) notFound();
  return <RedirectForm value={{ id: r.id, from_path: r.from_path, to_path: r.to_path, status_code: r.status_code, note: r.note }} />;
}
