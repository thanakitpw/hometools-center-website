'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, Trash2, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateAlt, deleteMedia } from './actions';

type M = {
  id: string;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export default function MediaGrid({ items, total, page, totalPages }: { items: M[]; total: number; page: number; totalPages: number }) {
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<M | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'uploads');
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(`อัปโหลด ${file.name} ล้มเหลว: ${err.error ?? res.statusText}`);
        }
      }
      toast.success('อัปโหลดสำเร็จ');
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">รูปภาพ ({total.toLocaleString()})</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1" /> {uploading ? 'กำลังอัปโหลด…' : 'อัปโหลด'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {items.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            className="aspect-square bg-slate-100 rounded-lg overflow-hidden border hover:ring-2 hover:ring-slate-400 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.public_url} alt={m.alt_text ?? ''} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
        {items.length === 0 && <p className="col-span-full text-center py-12 text-slate-500">ยังไม่มีรูปภาพ</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {page > 1 && <Button asChild variant="outline" size="sm"><Link href={`/admin/media?page=${page - 1}`}>← ก่อนหน้า</Link></Button>}
          <span className="text-sm text-slate-500">หน้า {page} / {totalPages}</span>
          {page < totalPages && <Button asChild variant="outline" size="sm"><Link href={`/admin/media?page=${page + 1}`}>ถัดไป →</Link></Button>}
        </div>
      )}

      {selected && <MediaModal item={selected} onClose={() => setSelected(null)} onChanged={() => router.refresh()} />}
    </div>
  );
}

function MediaModal({ item, onClose, onChanged }: { item: M; onClose: () => void; onChanged: () => void }) {
  const [alt, setAlt] = useState(item.alt_text ?? '');
  const [pending, start] = useTransition();
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.public_url} alt={item.alt_text ?? ''} className="max-h-[50vh] mx-auto" />
        <div className="space-y-2 text-sm">
          <div className="flex gap-2 items-center">
            <Input readOnly value={item.public_url} className="font-mono text-xs" />
            <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(item.public_url); toast.success('คัดลอกแล้ว'); }}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="text-slate-500 text-xs">
            {item.mime_type} · {item.size_bytes ? Math.round(item.size_bytes / 1024) + ' KB' : '—'} · {new Date(item.created_at).toLocaleString('th-TH')}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Alt text</label>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="คำอธิบายรูป (สำคัญต่อ SEO)" />
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => {
            if (confirm('ลบรูปนี้?')) start(async () => {
              const r = await deleteMedia(item.id, item.storage_path);
              if (r?.error) toast.error(r.error);
              else { onChanged(); onClose(); toast.success('ลบแล้ว'); }
            });
          }} disabled={pending}>
            <Trash2 className="w-4 h-4 mr-1" /> ลบ
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>ปิด</Button>
            <Button onClick={() => start(async () => {
              const r = await updateAlt(item.id, alt);
              if (r?.error) toast.error(r.error); else { onChanged(); onClose(); toast.success('บันทึกแล้ว'); }
            })} disabled={pending}>บันทึก</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
