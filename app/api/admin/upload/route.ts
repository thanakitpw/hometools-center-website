import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function safeName(filename: string) {
  const ext = (filename.split('.').pop() ?? 'bin').toLowerCase();
  // If non-ASCII, hash; else slugify
  if (/[^\x00-\x7F]/.test(filename)) {
    const hash = createHash('md5').update(filename + Date.now()).digest('hex').slice(0, 12);
    return `u-${hash}.${ext}`;
  }
  const base = filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || randomUUID().slice(0, 8)}.${ext}`;
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fd = await req.formData();
  const file = fd.get('file') as File | null;
  const folder = String(fd.get('folder') ?? 'uploads');
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const name = safeName(file.name);
  const path = `${folder}/${name}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from('media').upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from('media').getPublicUrl(path);
  const public_url = pub.publicUrl;

  const supa = await createClient();
  await supa.from('media').insert({
    storage_path: path,
    public_url,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  });

  return NextResponse.json({ url: public_url, path });
}
