# ════════════════════════════════════════════════════════════════
# Stage 1 — Builder
# Compile TypeScript, génère le client Prisma
# ════════════════════════════════════════════════════════════════
FROM node:20.18.0-alpine AS builder

WORKDIR /app

# Un seul COPY pour tout le contexte — des COPY séparés par sous-dossier
# (prisma/, src/) se sont montrés instables sur le builder Railway
# ("failed to compute cache key... not found" aléatoire d'un build à
# l'autre, sur des instantanés pourtant frais). Un COPY unique élimine
# ce risque ; le cache Docker est moins fin mais le repo est petit.
COPY . .

RUN npm ci --workspace=apps/backend
RUN cd apps/backend && npx prisma generate
RUN cd apps/backend && npm run build


# ════════════════════════════════════════════════════════════════
# Stage 2 — Runner
# Image de production allégée, utilisateur non-root
# ════════════════════════════════════════════════════════════════
FROM node:20.18.0-alpine AS runner

# Utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S warah && \
    adduser -u 1001 -S warah -G warah

WORKDIR /app

# Même principe qu'à l'étape builder — un seul COPY pour tout le contexte
COPY . .

# Installer uniquement les dépendances de production
RUN npm ci --workspace=apps/backend --omit=dev && \
    npm cache clean --force

# Générer le client Prisma dans l'env de production
RUN cd apps/backend && npx prisma generate

# Remplacer le dist source par le dist compilé depuis le builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Changer le propriétaire des fichiers
RUN chown -R warah:warah /app

USER warah

EXPOSE 3000

# Health check sur /health/live (léger, sans dépendances DB)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

# Exécuter les migrations puis démarrer l'application
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy && node dist/main"]
