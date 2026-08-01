FROM node:20-alpine AS shared-builder

WORKDIR /app/shared
COPY shared/package.json shared/tsconfig.json ./
COPY shared/src ./src
RUN npm install && npm run build

FROM node:20-alpine AS bot-builder

WORKDIR /app
COPY package.json ./
COPY bot/package.json bot/tsconfig.json ./bot/
COPY bot/src ./bot/src
COPY --from=shared-builder /app/shared/package.json ./shared/package.json
COPY --from=shared-builder /app/shared/dist ./shared/dist
WORKDIR /app/bot
RUN mkdir -p node_modules/@thez && cp -r ../shared node_modules/@thez/shared && npm install && npm run build

FROM node:20-alpine AS dashboard-builder

WORKDIR /app
COPY package.json ./
COPY dashboard/package.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src
COPY --from=shared-builder /app/shared/package.json ./shared/package.json
COPY --from=shared-builder /app/shared/dist ./shared/dist
WORKDIR /app/dashboard
RUN mkdir -p node_modules/@thez && cp -r ../shared node_modules/@thez/shared && npm install && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=shared-builder /app/shared/dist ./shared/dist
COPY --from=bot-builder /app/bot/dist ./bot/dist
COPY --from=bot-builder /app/bot/node_modules ./bot/node_modules
COPY --from=bot-builder /app/bot/package.json ./bot/package.json
COPY --from=dashboard-builder /app/dashboard/.next ./dashboard/.next
COPY --from=dashboard-builder /app/dashboard/node_modules ./dashboard/node_modules
COPY --from=dashboard-builder /app/dashboard/package.json ./dashboard/package.json
COPY --from=dashboard-builder /app/dashboard/next.config.js ./dashboard/next.config.js

# Create certs directory
RUN mkdir -p /app/certs

# Create startup script
RUN echo '#!/bin/sh\n\
cd /app/bot && node dist/index.js &\n\
cd /app/dashboard && npm run start\n' > /app/start.sh && chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3000

CMD ["/app/start.sh"]
