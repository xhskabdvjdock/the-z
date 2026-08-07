FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json for workspace
COPY package.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Copy dashboard package.json and install dependencies
COPY dashboard/package.json dashboard/tsconfig.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src
COPY dashboard/public ./dashboard/public
WORKDIR /app/dashboard
RUN npm install && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/dashboard/.next ./.next
COPY --from=builder /app/dashboard/node_modules ./node_modules
COPY --from=builder /app/dashboard/package.json ./package.json
COPY --from=builder /app/dashboard/next.config.js ./next.config.js
COPY --from=builder /app/dashboard/public ./public

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
