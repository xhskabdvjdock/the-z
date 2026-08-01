FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json for workspace
COPY package.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Copy bot package.json and install dependencies
COPY bot/package.json bot/tsconfig.json ./bot/
COPY bot/src ./bot/src
WORKDIR /app/bot
RUN npm install && npm run build

# Copy dashboard package.json and install dependencies
COPY dashboard/package.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src
WORKDIR /app/dashboard
RUN npm install && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/bot/dist ./bot/dist
COPY --from=builder /app/bot/node_modules ./bot/node_modules
COPY --from=builder /app/bot/package.json ./bot/package.json
COPY --from=builder /app/dashboard/.next ./dashboard/.next
COPY --from=builder /app/dashboard/node_modules ./dashboard/node_modules
COPY --from=builder /app/dashboard/package.json ./dashboard/package.json
COPY --from=builder /app/dashboard/next.config.js ./dashboard/next.config.js

# Create certs directory
RUN mkdir -p /app/certs

# Create startup script
RUN echo '#!/bin/sh\n\
cd /app/bot && node dist/index.js &\n\
cd /app/dashboard && npm run start\n' > /app/start.sh && chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3000

CMD ["/app/start.sh"]
