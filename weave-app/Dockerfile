# ===================================================================================
# ESTÁGIO 1: O "Builder" (O nosso canteiro de obras)
# ===================================================================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# ===================================================================================
# ESTÁGIO 2: O "Production" (Executando com Next.js)
# ===================================================================================
FROM node:24-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl gnupg \
  && (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler
ENV DOPPLER_CONFIG=prd

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar o build do Next.js do estágio anterior
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Mudar ownership dos arquivos para o usuário nextjs
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expõe a porta 3000, que é a porta padrão do Next.js
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["doppler", "run", "--project", "weave-app", "--config", "prd", "--", "npm", "start"]