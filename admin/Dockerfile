FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY admin/package.json admin/package-lock.json ./
RUN npm ci --no-fund
COPY admin/src ./src
COPY admin/tsconfig.json admin/next-env.d.ts admin/next.config.ts ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --chown=node:node admin/db ./db
USER node
EXPOSE 3100
CMD ["node","server.js"]
