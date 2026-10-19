FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
# The game API replays runs with the app's own simulation (src/game, TypeScript run by Node's type stripping).
COPY src/game ./src/game
COPY src/config/game.ts ./src/config/game.ts
COPY dist ./dist
COPY server-assets ./server-assets
RUN mkdir -p /app/.local && chown node:node /app/.local
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]

FROM node:22-bookworm-slim AS preview
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force
ENV CI=1 EXPO_NO_DOTENV=1 EXPO_TELEMETRY_DISABLED=1 NODE_ENV=development
COPY app.json tsconfig.json ./
COPY src ./src
COPY server/avatar ./server/avatar
COPY assets ./assets
COPY server-assets ./server-assets
COPY data/pilot ./data/pilot
COPY data/menus ./data/menus
COPY deploy/preview-gateway.mjs ./preview-gateway.mjs
RUN mkdir -p .expo .local && chown -R node:node .expo .local && chown node:node /app /app/tsconfig.json /app/app.json
USER node
EXPOSE 8080
CMD ["node", "preview-gateway.mjs"]
