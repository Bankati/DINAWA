import { PrismaService } from '../../prisma/prisma.service';

// Espace de noms des verrous des tâches planifiées (forme à deux clés de
// pg_try_advisory_xact_lock) : ne croise jamais un verrou à une seule clé,
// notamment ceux laissés par l'ancienne version (voir plus bas).
const CRON_LOCK_NAMESPACE = 4247;
// Durée maximale d'une exécution protégée : au-delà, Prisma annule la
// transaction et le verrou tombe (la tâche, elle, se termine). Large pour
// les reversements (appels PayDunya en série).
const CRON_LOCK_MAX_DURATION_MS = 10 * 60 * 1000;
const CRON_LOCK_MAX_WAIT_MS = 10_000;

// Empêche deux instances NestJS (ou deux exécutions qui se chevauchent) de
// lancer la même tâche planifiée en parallèle (voir code-standards.md,
// "Cron Jobs et Tâches Planifiées" — obligatoire pour tout job dont la
// duplication est dangereuse). `hashtext()` convertit la clé en entier côté
// Postgres — collision négligeable pour le petit nombre de jobs du projet.
//
// Verrou de TRANSACTION, plus de session (correctif du 2026-10-18) : la base
// est jointe par le pooler Supabase (Supavisor, mode transaction, port
// 6543), où deux requêtes successives ne passent pas forcément par la même
// connexion serveur. L'ancien `pg_try_advisory_lock` + `pg_advisory_unlock`
// prenait le verrou sur une connexion et le relâchait sur une autre : le
// verrou restait tenu à vie par une connexion inactive du pooler et la tâche
// était sautée à chaque passage (« une instance détient déjà le verrou » —
// constaté sur les reversements, le rattrapage WhatsApp, la réconciliation
// PayDunya). Ici, le verrou vit dans une transaction ouverte pendant toute
// l'exécution : une transaction reste sur UNE connexion, et Postgres libère
// le verrou tout seul à la fin (validation, annulation ou coupure).
// La tâche elle-même continue d'utiliser `prisma` normalement (ses requêtes
// ne sont pas dans cette transaction).
export async function withAdvisoryLock<T>(
  prisma: PrismaService,
  lockKey: string,
  task: () => Promise<T>,
): Promise<T | null> {
  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<[{ locked: boolean }]>`
        SELECT pg_try_advisory_xact_lock(${CRON_LOCK_NAMESPACE}::int, hashtext(${lockKey})) AS locked
      `;
      if (!locked) return null;
      return task();
    },
    { maxWait: CRON_LOCK_MAX_WAIT_MS, timeout: CRON_LOCK_MAX_DURATION_MS },
  );
}
