# API + frontend
FROM node:22-trixie-slim

WORKDIR /app/backend

# install dependencies first (cached unless package files change)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/server.js ./
COPY frontend /app/frontend

ENV PORT=3000 \
    DB_PATH=/data/transport.db \
    FRONTEND_DIR=/app/frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
