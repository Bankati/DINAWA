/**
 * Crée un compte administrateur WARAH.
 * Usage : node scripts/create-admin.js
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient }  = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const ADMIN_EMAIL    = 'admin@warah.tg';
const ADMIN_PASSWORD = 'Admin@warah2026!';
const ADMIN_PRENOM   = 'Admin';
const ADMIN_NOM      = 'WARAH';

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const prisma = new PrismaClient();

  try {
    console.log('1. Création du compte Supabase Auth…');

    // Vérifie si le compte existe déjà dans Supabase
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);

    let supabaseId;

    if (existing) {
      console.log('   → Compte Supabase déjà existant, mise à jour du mot de passe…');
      await supabase.auth.admin.updateUserById(existing.id, { password: ADMIN_PASSWORD });
      supabaseId = existing.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(`Supabase Auth : ${error.message}`);
      supabaseId = data.user.id;
      console.log(`   → Compte Supabase créé (id: ${supabaseId})`);
    }

    console.log('2. Création/mise à jour du profil Prisma…');

    const user = await prisma.user.upsert({
      where: { supabaseId },
      create: {
        supabaseId,
        email:     ADMIN_EMAIL,
        firstName: ADMIN_PRENOM,
        lastName:  ADMIN_NOM,
        role:      'ADMIN',
      },
      update: {
        role:      'ADMIN',
        firstName: ADMIN_PRENOM,
        lastName:  ADMIN_NOM,
      },
    });

    console.log(`   → Profil Prisma OK (id: ${user.id}, rôle: ${user.role})`);

    console.log('\n✅ Compte admin créé avec succès !');
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Mot de passe : ${ADMIN_PASSWORD}`);
    console.log('   Connexion : http://localhost:4200/auth/login\n');

  } catch (err) {
    console.error('\n❌ Erreur :', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
