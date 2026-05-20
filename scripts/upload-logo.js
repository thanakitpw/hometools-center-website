require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const LOGO = 'https://hometools-center.com/wp-content/uploads/2024/05/revise_logo_2022_27D_10.png';

(async () => {
  const res = await fetch(LOGO);
  if (!res.ok) { console.error('fetch', res.status); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  const objectPath = '2024/05/revise_logo_2022_27D_10.png';
  const { error } = await sb.storage.from('media').upload(objectPath, buf, {
    contentType: 'image/png',
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) { console.error(error); process.exit(1); }
  const { data } = sb.storage.from('media').getPublicUrl(objectPath);
  console.log('LOGO URL:', data.publicUrl);
})();
