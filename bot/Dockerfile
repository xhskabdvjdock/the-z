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

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/bot/dist ./dist
COPY --from=builder /app/bot/node_modules ./node_modules
COPY --from=builder /app/bot/package.json ./package.json

# Create certs directory
RUN mkdir -p /app/certs

CMD ["node", "dist/index.js"]

# Command deployment stage
FROM node:20-alpine AS deploy

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
RUN npm install

# Deploy commands
CMD ["npm", "run", "deploy"]

# Clear commands stage
FROM node:20-alpine AS clear

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
RUN npm install

# Clear commands
CMD ["npm", "run", "clear"]
