FROM node:20-alpine

WORKDIR /app

# Copy root package.json for workspaces
COPY package.json ./

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

# Simple shell script: deploy bot, start bot in background, then start dashboard
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "=== Starting deployment ==="' >> /app/start.sh && \
    echo 'cd /app/bot && npm run deploy' >> /app/start.sh && \
    echo 'echo "=== Starting bot in background ==="' >> /app/start.sh && \
    echo 'cd /app/bot && node dist/index.js > /tmp/bot.log 2>&1 &' >> /app/start.sh && \
    echo 'BOT_PID=$!' >> /app/start.sh && \
    echo 'echo "Bot PID: $BOT_PID"' >> /app/start.sh && \
    echo 'echo "=== Waiting 10 seconds for bot to start ==="' >> /app/start.sh && \
    echo 'sleep 10' >> /app/start.sh && \
    echo 'echo "=== Starting dashboard ==="' >> /app/start.sh && \
    echo 'cd /app/dashboard && npm run start' >> /app/start.sh && \
    chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3000

CMD ["/bin/sh", "/app/start.sh"]
