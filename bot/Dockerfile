FROM node:20-alpine

WORKDIR /app

# Copy from parent directory structure
COPY package.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY bot/package.json bot/tsconfig.json ./bot/
COPY bot/src ./bot/src
COPY dashboard/package.json dashboard/tsconfig.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src

# Install dependencies
RUN npm install

# Build shared
RUN npm run build --workspace=@thez/shared

# Build bot
RUN npm run build --workspace=bot

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production

WORKDIR /app/bot
CMD ["node", "dist/index.js"]
