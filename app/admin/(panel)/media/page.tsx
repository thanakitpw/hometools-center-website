import { createClient } from '@/lib/supabase/server';
import MediaGrid from './media-grid';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 60;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page = '1' } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const s = await createClient();
  const { data, count } = await s
    .from('media')
    .select('id, storage_path, public_url, alt_text, mime_type, size_bytes, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <MediaGrid items={data ?? []} total={total} page={pageNum} totalPages={totalPages} />;
}
