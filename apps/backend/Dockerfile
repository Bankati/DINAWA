# ════════════════════════════════════════════════════════════════
# Stage 1 — Builder
# Backend autonome — n'utilise plus `npm ci --workspace=apps/backend`
# depuis que le package.json racine a été repris par le frontend
# (restructuration Vercel, plus aucun champ "workspaces" ; voir
# apps/backend/contexte/progress-tracker.md). apps/backend a son
# propre package-lock.json et s'installe indépendamment, insensible à
# ce que fait le frontend à la racine du repo.
# ════════════════════════════════════════════════════════════════
FROM node:22.12.0-alpine AS builder

# OpenSSL explicite — sans ça, le moteur Prisma échoue à détecter la
# version d'OpenSSL sur cette image Alpine et plante au démarrage
# ("Could not parse schema engine response").
RUN apk add --no-cache openssl

WORKDIR /app

# Copié séparément du reste du code source pour que cette couche
# (la plus lente, `npm ci`) reste en cache tant que les dépendances
# ne changent pas, même si le code applicatif change.
COPY apps/backend/package.json apps/backend/package-lock.json ./
RUN npm ci

COPY apps/backend/ .

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

EXPOSE 3000

# Health check sur /health/live (léger, sans dépendances DB)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

# Exécuter les migrations puis démarrer l'application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
