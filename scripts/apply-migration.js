// Apply SQL migration via Supabase HTTP API.
// Uses service_role key + the undocumented but stable /rest/v1/rpc + Postgres meta.
// Simpler approach: split SQL by semicolon and POST each batch to /pg endpoint.
// Since direct SQL execution isn't exposed via REST, we use pg client directly.
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('missing env'); process.exit(1); }

// Extract project ref from URL
const projectRef = new URL(url).hostname.split('.')[0];

async function runSQL(sql) {
  // Use Supabase's PostgREST RPC pattern via a query function we'll create.
  // BUT — simpler path: use direct connection via pg.
  // We don't have pg installed; let's use Supabase's "sql" endpoint via service key.
  // Actually the cleanest: use https://api.supabase.com/v1/projects/{ref}/database/query
  // — that requires a management API token though.
  //
  // Easiest practical path: connect via pg through the connection pooler. But that needs DB password.
  //
  // Fallback: ask user to paste the SQL into the Supabase SQL Editor.
  throw new Error('not implemented — use SQL Editor');
}

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '0001_init.sql'), 'utf8');
console.log('Migration SQL length:', sql.length, 'bytes');
console.log('\n⚠️  To apply this migration, open Supabase SQL Editor:');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log('   Paste the contents of supabase/migrations/0001_init.sql and click Run.');
console.log('\n   Or run: cat supabase/migrations/0001_init.sql | pbcopy');
console.log('   …to copy SQL to clipboard, then paste in SQL Editor.\n');
