# Container da aplicação Slanko (slanko-app), descrito no C4 de contêineres.
# Build: docker compose --profile app up -d --build

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  SLANKO_UPLOADS_DIR=/app/uploads
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/src/lib/http/security-headers.ts ./src/lib/http/security-headers.ts
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads /app/.next
USER node
EXPOSE 3000
# Aplica as migrations pendentes e sobe o servidor de produção.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start"]
