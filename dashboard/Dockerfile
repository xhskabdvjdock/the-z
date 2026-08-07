FROM node:20-alpine

WORKDIR /app

# Copy everything from root
COPY . ../

# Move to dashboard directory
WORKDIR /app/dashboard

# Install dependencies from root
RUN cd /app && npm install

# Build shared
RUN cd /app && npm run build --workspace=@thez/shared

# Build dashboard
RUN npm run build

# Create certs directory
RUN mkdir -p /app/certs

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
