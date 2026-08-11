import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 8000;
// Ping DB toutes les 45s pour garder la connexion PgBouncer chaude et éviter
// les 2-3s de reconnexion sur les premières requêtes après inactivité.
const KEEPALIVE_INTERVAL_MS = 45_000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private keepaliveTimer?: ReturnType<typeof setInterval>;

  // Omission globale de passwordHash — jamais renvoyé dans une réponse HTTP
  // par erreur (signup, /auth/me, tout autre endpoint qui sérialise un User)
  // sans avoir à y penser à chaque site d'appel. Seul AuthService.login() en
  // a besoin, et l'y réactive explicitement via `omit: { passwordHash: false }`
  // sur cette requête précise (voir modules/auth/auth.service.ts).
  constructor() {
    super({ omit: { user: { passwordHash: true } } });
  }

  async onModuleInit(): Promise<void> {
    await this.wakeupSupabase();
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this['$connect']();
        if (attempt > 1) {
          console.log(`[Prisma] Connexion établie (tentative ${attempt})`);
        }
        this.startKeepalive();
        return;
      } catch (error) {
        if (attempt === MAX_RETRIES) throw error;
        console.warn(
          `[Prisma] Tentative ${attempt}/${MAX_RETRIES} échouée. Nouvel essai dans ${RETRY_DELAY_MS / 1000}s…`,
        );
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      }
    }
  }

  // Maintient la connexion PgBouncer chaude — évite les cold reconnects coûteux
  private startKeepalive(): void {
    this.keepaliveTimer = setInterval(() => {
      this.$queryRaw`SELECT 1`.catch(() => {
        // Silencieux — la reconnexion se fera automatiquement sur la prochaine requête
      });
    }, KEEPALIVE_INTERVAL_MS);
  }

  // Ping HTTP Supabase pour sortir le projet de veille avant la connexion PG
  private async wakeupSupabase(): Promise<void> {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_ANON_KEY'];
    if (!url || !key) return;
    try {
      const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      console.log(`[Prisma] Ping Supabase → HTTP ${res.status}`);
    } catch {
      console.warn('[Prisma] Ping Supabase échoué (pas bloquant)');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
    await this['$disconnect']();
  }
}
