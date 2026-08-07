FROM node:20-alpine

WORKDIR /app

# Copy root package.json for workspaces
COPY package.json ./

# Copy shared package
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Copy bot
COPY bot/package.json bot/tsconfig.json ./bot/
COPY bot/src ./bot/src

# Copy dashboard
COPY dashboard/package.json dashboard/tsconfig.json dashboard/next.config.js dashboard/tailwind.config.ts dashboard/postcss.config.js ./dashboard/
COPY dashboard/src ./dashboard/src

# Install all dependencies using workspaces
RUN npm install

# Build shared
RUN npm run build --workspace=@thez/shared

# Build bot
RUN npm run build --workspace=bot

# Build dashboard
RUN npm run build --workspace=dashboard

# Create certs directory
RUN mkdir -p /app/certs

# Create a Node.js script to run both processes
RUN echo 'const { spawn } = require("child_process");' > /app/run.js && \
    echo 'const bot = spawn("node", ["/app/bot/dist/index.js"], { stdio: "inherit", detached: true });' >> /app/run.js && \
    echo 'console.log("Bot started with PID:", bot.pid);' >> /app/run.js && \
    echo 'const dashboard = spawn("npm", ["run", "start"], { cwd: "/app/dashboard", stdio: "inherit" });' >> /app/run.js && \
    echo 'console.log("Dashboard starting...");' >> /app/run.js && \
    echo 'dashboard.on("exit", (code) => { console.log("Dashboard exited:", code); process.exit(code); });' >> /app/run.js && \
    echo 'bot.on("exit", (code) => { console.log("Bot exited:", code); });' >> /app/run.js

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "/app/run.js"]
