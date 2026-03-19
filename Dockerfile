FROM node:20-alpine

# git is required for the self-update endpoint
RUN apk add --no-cache git

WORKDIR /app

# ── Backend dependencies ──────────────────────────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# ── Frontend dependencies ─────────────────────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# ── Build backend ─────────────────────────────────────────────────────────────
COPY backend/ ./backend/
RUN cd backend && npm run build && cp src/database/schema.sql dist/database/schema.sql

# ── Build frontend (outDir: ../backend/public via vite config) ────────────────
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Copy .git for self-update (git pull inside container) ────────────────────
COPY .git .git

# ── Runtime volumes ───────────────────────────────────────────────────────────
RUN mkdir -p /music /data /artwork

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV MUSIC_DIR=/music
ENV DB_PATH=/data/music.db
ENV ARTWORK_DIR=/artwork
# Set GIT_REMOTE at runtime to enable the Update button, e.g.:
#   -e GIT_REMOTE=https://github.com/you/Music-archiver
#   -e GIT_BRANCH=main   (defaults to current branch)

WORKDIR /app/backend
CMD ["/docker-entrypoint.sh"]
