import { PrismaService } from '../../prisma/prisma.service';

// Empêche deux instances NestJS (ou deux exécutions qui se chevauchent) de
// lancer la même tâche planifiée en parallèle (voir code-standards.md,
// "Cron Jobs et Tâches Planifiées" — obligatoire pour tout job dont la
// duplication est dangereuse). `hashtext()` convertit la clé en bigint côté
// Postgres — collision négligeable pour le petit nombre de jobs du projet.
export async function withAdvisoryLock<T>(
  prisma: PrismaService,
  lockKey: string,
  task: () => Promise<T>,
): Promise<T | null> {
  const [{ locked }] = await prisma['$queryRaw']<[{ locked: boolean }]>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
  `;

  if (!locked) return null;

  try {
    return await task();
  } finally {
    await prisma['$queryRaw']`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
  }
}
