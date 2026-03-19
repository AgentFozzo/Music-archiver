# Stage 1: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build && cp src/database/schema.sql dist/database/schema.sql

# Stage 2: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 3: Final image
FROM node:20-alpine AS final
WORKDIR /app

# Install production backend dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend
COPY --from=backend-build /app/backend/dist ./dist

# Copy frontend build (served as static files)
COPY --from=frontend-build /app/backend/public ./public

# Create directories for volumes
RUN mkdir -p /music /data /artwork

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV MUSIC_DIR=/music
ENV DB_PATH=/data/music.db
ENV ARTWORK_DIR=/artwork

CMD ["node", "dist/index.js"]
