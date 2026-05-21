import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type AdminUser = {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  display_name: string | null;
};

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('admin_users')
    .select('user_id, role, display_name')
    .eq('user_id', user.id)
    .single();

  if (!data) return null;
  return {
    id: user.id,
    email: user.email!,
    role: data.role as 'admin' | 'editor',
    display_name: data.display_name,
  };
}

export async function requireAdmin(): Promise<AdminUser> {
  const u = await getAdminUser();
  if (!u) throw new Error('UNAUTHORIZED');
  return u;
}
