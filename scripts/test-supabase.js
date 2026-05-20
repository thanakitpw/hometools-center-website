require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('missing env'); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  console.log('URL:', url);
  console.log('Key role:', JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString()).role);

  // Attempt to query a table that doesn't exist yet — should return PGRST204 or 42P01
  const { error: tableErr } = await sb.from('products').select('id').limit(1);
  if (tableErr) {
    console.log('products table check:', tableErr.code, '-', tableErr.message);
  } else {
    console.log('products table exists ✓');
  }
})();
