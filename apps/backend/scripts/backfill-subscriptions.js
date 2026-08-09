/**
 * Rétro-remplit un abonnement Subscription (STARTER + 3 mois de bêta à
 * partir d'aujourd'hui) pour tout compte OWNER/MANAGER existant qui n'en a
 * pas encore — voir /architect unité 35, décision "bêta fraîche, pas
 * rétroactive à la date d'inscription réelle" (personne n'a jamais été
 * facturé jusqu'ici, Cashpay jamais branché).
 *
 * Idempotent : ne touche jamais un compte qui a déjà un Subscription.
 * Usage : node scripts/backfill-subscriptions.js
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BETA_FREE_MONTHS = 3;

async function main() {
  const prisma = new PrismaClient();

  try {
    const accountsWithoutSubscription = await prisma.user.findMany({
      where: {
        role: { in: ['OWNER', 'MANAGER'] },
        anonymizedAt: null,
        subscription: null,
      },
      select: { id: true, email: true, role: true },
    });

    console.log(`${accountsWithoutSubscription.length} compte(s) sans abonnement trouvé(s).`);

    const betaUntil = new Date();
    betaUntil.setMonth(betaUntil.getMonth() + BETA_FREE_MONTHS);

    for (const account of accountsWithoutSubscription) {
      await prisma.subscription.create({
        data: { userId: account.id, tier: 'STARTER', betaUntil },
      });
      console.log(`  → ${account.email ?? account.id} (${account.role}) : Subscription STARTER créée.`);
    }

    console.log('\n✅ Rétro-remplissage terminé.');
  } catch (err) {
    console.error('\n❌ Erreur :', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
