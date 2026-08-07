FROM node:20-alpine

WORKDIR /app

# Install concurrently to run both services at once
RUN npm install -g concurrently

# Copy root package files (workspace config)
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
ENV PORT=3000

WORKDIR /app

# Run both bot and dashboard at the same time
CMD ["concurrently", "--kill-others-on-fail", "--names", "BOT,WEB", "--prefix-colors", "blue,green", "node bot/dist/index.js", "npm run start --workspace=dashboard"]
