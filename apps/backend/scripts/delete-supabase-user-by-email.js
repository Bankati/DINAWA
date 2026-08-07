// Usage: node scripts/delete-supabase-user-by-email.js email@exemple.com
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const email = process.argv[2];
if (!email) { console.error('Usage: node scripts/delete-supabase-user-by-email.js <email>'); process.exit(1); }

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) { console.error('Erreur listUsers:', error.message); process.exit(1); }

  const user = data?.users?.find((u) => u.email === email);
  if (!user) { console.log(`Aucun compte Supabase Auth trouvé pour : ${email}`); process.exit(0); }

  console.log(`Trouvé : ${user.id} (${user.email}) — suppression...`);
  const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
  if (delErr) { console.error('Erreur suppression:', delErr.message); process.exit(1); }
  console.log(`✓ Compte Supabase Auth supprimé pour ${email}. Vous pouvez maintenant vous ré-inscrire avec cet email.`);
}

main();
