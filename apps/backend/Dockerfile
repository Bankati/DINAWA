# ════════════════════════════════════════════════════════════════
# Stage 1 — Builder
# Installe, génère Prisma, compile, puis élague les dépendances de
# dev — tout en une seule étape séquentielle. Auparavant, le stage
# runner relançait son propre `npm ci` indépendant, exécuté par
# BuildKit en parallèle du builder ; sur le builder Railway ("Metal
# builder") ça provoquait une erreur intermittente et non
# reproductible en local ("No workspaces found"). En supprimant le
# second `npm ci` indépendant, on élimine ce risque de concurrence.
# ════════════════════════════════════════════════════════════════
FROM node:22.12.0-alpine AS builder

# OpenSSL explicite — sans ça, le moteur Prisma échoue à détecter la
# version d'OpenSSL sur cette image Alpine et plante au démarrage
# ("Could not parse schema engine response").
RUN apk add --no-cache openssl

WORKDIR /app

COPY . .

RUN npm ci --workspace=apps/backend
RUN cd apps/backend && npx prisma generate
RUN cd apps/backend && npm run build
RUN npm prune --omit=dev


# ════════════════════════════════════════════════════════════════
# Stage 2 — Runner
# Image de production allégée, utilisateur non-root — copie
# intégralement le résultat déjà élagué du builder, sans réinstaller
# quoi que ce soit ici.
# ════════════════════════════════════════════════════════════════
FROM node:22.12.0-alpine AS runner

# Même raison qu'à l'étape builder — requis au runtime pour que le
# moteur Prisma (migrate deploy + client) fonctionne correctement
RUN apk add --no-cache openssl

RUN addgroup -g 1001 -S warah && \
    adduser -u 1001 -S warah -G warah

WORKDIR /app

COPY --from=builder --chown=warah:warah /app ./

USER warah

EXPOSE 3000

# Health check sur /health/live (léger, sans dépendances DB)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

# Exécuter les migrations puis démarrer l'application
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy && node dist/main"]
