FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Desarrollo ────────────────────────────────────────────────
FROM base AS development
COPY . .
CMD ["npm", "run", "start:dev"]

# ── Build ─────────────────────────────────────────────────────
FROM base AS build
COPY . .
RUN npm run build
RUN npm prune --production

# ── Producción ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
