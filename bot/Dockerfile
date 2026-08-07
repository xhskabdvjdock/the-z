FROM node:20-alpine

WORKDIR /app

# Copy everything from root for workspaces
COPY . ../

# Move to bot directory
WORKDIR /app/bot

# Install dependencies from root
RUN cd /app && npm install

# Build shared
RUN cd /app && npm run build --workspace=@thez/shared

# Build bot
RUN npm run build

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
