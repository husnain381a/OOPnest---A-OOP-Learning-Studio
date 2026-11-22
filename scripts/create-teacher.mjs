import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const email = 'aimenansari008@gmail.com';
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in your private environment.');
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const password = `PF!${randomBytes(22).toString('base64url')}9a`;

try {
  const { error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: 'Aimen' }, app_metadata: { pfn_teacher: true },
  });
  if (error) throw error;
  console.log(`Teacher email: ${email}\nTemporary password: ${password}`);
} catch (error) {
  console.error(`Teacher setup failed: ${error.message}`);
  process.exitCode = 1;
}
