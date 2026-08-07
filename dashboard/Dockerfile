FROM node:20-alpine

WORKDIR /app

# Copy root package files (workspace config)
COPY package.json package-lock.json ./

# Copy shared package
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Copy bot package (needed for workspace resolution)
COPY bot/package.json bot/tsconfig.json ./bot/
COPY bot/src ./bot/src

# Copy dashboard package
COPY dashboard/package.json dashboard/tsconfig.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src

# Install all dependencies
RUN npm install

# Build shared first
RUN npm run build --workspace=@thez/shared

# Build dashboard
RUN npm run build --workspace=dashboard

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/dashboard
CMD ["npm", "run", "start"]
