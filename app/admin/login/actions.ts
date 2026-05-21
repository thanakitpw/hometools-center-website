'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!email || !password) {
    return { error: 'กรุณากรอกอีเมลและรหัสผ่าน' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .single();

  if (!admin) {
    await supabase.auth.signOut();
    return { error: 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบจัดการ' };
  }

  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
