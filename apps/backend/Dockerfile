# ════════════════════════════════════════════════════════════════
# Stage 1 — Builder
# Monorepo npm workspaces (package.json racine, réintroduit le
# 2026-08-09 pour turborepo) — npm ci se fait depuis la racine avec
# le lockfile racine, jamais depuis apps/backend/ isolément : son
# propre package-lock.json n'est plus mis à jour depuis l'ajout des
# workspaces et est périmé (voir contexte/progress-tracker.md).
# ════════════════════════════════════════════════════════════════
FROM node:22.12.0-alpine AS builder

# OpenSSL explicite — sans ça, le moteur Prisma échoue à détecter la
# version d'OpenSSL sur cette image Alpine et plante au démarrage
# ("Could not parse schema engine response").
RUN apk add --no-cache openssl

WORKDIR /app

# Manifests seuls d'abord (les 3 du monorepo — npm ci vérifie que
# package-lock.json est en phase avec TOUS les workspaces déclarés,
# pas seulement celui qu'on construit) — cette couche reste en cache
# tant que les dépendances ne changent pas, même si le code applicatif
# change.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

COPY apps/backend/ apps/backend/

WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build
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

WORKDIR /app/apps/backend

EXPOSE 3000

# Health check sur /health/live (léger, sans dépendances DB)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

# Exécuter les migrations puis démarrer l'application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
