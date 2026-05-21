'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deleteRedirect } from './actions';
import { Trash2 } from 'lucide-react';

export default function DeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (confirm('ลบ redirect นี้?')) start(async () => {
          const r = await deleteRedirect(id);
          if (r?.error) toast.error(r.error);
        });
      }}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
