import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MessageDetail from './message-detail';

export const dynamic = 'force-dynamic';

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data } = await s.from('contact_messages').select('*').eq('id', id).single();
  if (!data) notFound();

  // Auto-mark as read on first open
  if (data.status === 'new') {
    await s.from('contact_messages').update({ status: 'read' }).eq('id', id);
    data.status = 'read';
  }

  return <MessageDetail value={data} />;
}
