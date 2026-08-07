FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy shared package
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Copy bot package
COPY bot/package.json bot/tsconfig.json ./bot/
COPY bot/src ./bot/src

# Copy dashboard package
COPY dashboard/package.json dashboard/tsconfig.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src

# Copy startup script
COPY start.js ./

# Install all dependencies
RUN npm install

# Build shared first
RUN npm run build --workspace=@thez/shared

# Build bot
RUN npm run build --workspace=bot

# Build dashboard
RUN npm run build --workspace=dashboard

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production

WORKDIR /app

# Bot starts first → when online → dashboard starts
CMD ["node", "start.js"]
