import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuoteDetail from './quote-detail';

export const dynamic = 'force-dynamic';

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data } = await s.from('quote_requests').select('*').eq('id', id).single();
  if (!data) notFound();
  return <QuoteDetail value={data} />;
}
