// Crée le bucket Supabase Storage 'payment-proofs' (privé)
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tbalvljmavxjdrzhuvol.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Erreur : SUPABASE_SERVICE_ROLE_KEY non défini. Passez-le en variable d\'environnement.');
    process.exit(1);
  }
  // Lister les buckets existants
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Impossible de lister les buckets :', listError.message);
    process.exit(1);
  }
  console.log('Buckets existants :', buckets.map((b) => b.name).join(', ') || '(aucun)');

  if (buckets.some((b) => b.name === 'payment-proofs')) {
    console.log('Le bucket "payment-proofs" existe déjà — rien à faire.');
    return;
  }

  const { data, error } = await supabase.storage.createBucket('payment-proofs', {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024, // 10 Mo
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  });

  if (error) {
    console.error('Erreur création bucket :', error.message);
    process.exit(1);
  }

  console.log('Bucket "payment-proofs" créé avec succès :', data);
}

main();
