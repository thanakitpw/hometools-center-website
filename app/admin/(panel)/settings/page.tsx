import { createClient } from '@/lib/supabase/server';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const s = await createClient();
  const [{ data: settings }, { data: menus }] = await Promise.all([
    s.from('site_settings').select('key, value'),
    s.from('menus').select('location, items'),
  ]);

  const settingsMap: Record<string, Record<string, string>> = {};
  (settings ?? []).forEach(s => { settingsMap[s.key] = (s.value as Record<string, string>) ?? {}; });

  const menuMap: Record<string, unknown[]> = { header: [], footer: [] };
  (menus ?? []).forEach(m => { menuMap[m.location] = (m.items as unknown[]) ?? []; });

  return <SettingsClient contact={settingsMap.contact ?? {}} seo={settingsMap.seo ?? {}} headerMenu={menuMap.header} footerMenu={menuMap.footer} />;
}
