# ---- dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- run ----
FROM node:20-alpine AS run
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Prisma CLI (same version as the project) + schema to apply the migrations at start-up
COPY --from=build /app/node_modules/prisma/package.json /tmp/prisma-package.json
RUN npm install -g prisma@$(node -p "require('/tmp/prisma-package.json').version") && npm cache clean --force
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
