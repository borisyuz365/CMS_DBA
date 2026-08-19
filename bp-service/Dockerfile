# BP Runtime — public mobile API (read-only).
#
# Build context MUST be the repo root (CMS_PROTOTYPE/), not bp-service/.
#
#   cd /path/to/CMS_PROTOTYPE
#   docker build -f bp-service/Dockerfile -t bp-runtime:latest .
#
# Or from bp-service/ (context = parent directory):
#   cd bp-service && npm run docker:build
#
# Or:
#   ./scripts/build-bp-runtime.sh
#
# WRONG (causes "lstat bp-service: no such file"):
#   cd bp-service && docker build -t bp-runtime .
FROM node:20-alpine
WORKDIR /app

COPY bp-service/package*.json ./bp-service/
RUN cd bp-service && npm ci --omit=dev

COPY bp-service/ ./bp-service/
COPY backend/services/bpCache.js backend/services/bpTargeting.js ./backend/services/
COPY backend/services/bp/formatRuntime.js ./backend/services/bp/
COPY backend/db/mysql.js ./backend/db/
COPY frontend/public/legal-logos ./public/legal-logos

RUN mkdir -p /app/backend/data/temp

WORKDIR /app/bp-service
ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "server.js"]
