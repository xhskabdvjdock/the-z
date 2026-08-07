FROM node:20-alpine

WORKDIR /app

# Copy shared package
COPY ../shared/package.json ../shared/tsconfig.json ./shared/
COPY ../shared/src ./shared/src

# Copy bot
COPY package.json tsconfig.json ./
COPY src ./src

# Install dependencies
RUN npm install

# Build shared
RUN npm run build --workspace=@thez/shared

# Build bot
RUN npm run build

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
