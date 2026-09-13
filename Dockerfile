FROM node:20-alpine

# ffmpeg و python لـ yt-dlp (تحميل تيك توك/انستا/تويتر)
RUN apk add --no-cache ffmpeg python3 py3-pip && pip3 install --no-cache-dir yt-dlp --break-system-packages

WORKDIR /app

# Copy root package.json for workspaces
COPY package.json ./

# Copy orchestrator entrypoint
COPY start.js ./

# Copy fonts
COPY fonts ./fonts/

# Copy shared package
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Copy bot
COPY bot/package.json bot/tsconfig.json ./bot/
COPY bot/src ./bot/src

# Copy dashboard
COPY dashboard/package.json dashboard/tsconfig.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src

# Install all dependencies using workspaces
RUN npm install

# Build shared
RUN npm run build --workspace=@thez/shared

# Build bot
RUN npm run build --workspace=bot

# Build dashboard
RUN npm run build --workspace=dashboard

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production
ENV PORT=3000

# Orchestrator: health on PORT منذ الثانية 0 ثم deploy → bot → dashboard
CMD ["node", "/app/start.js"]
