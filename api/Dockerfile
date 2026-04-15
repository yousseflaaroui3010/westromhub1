# --- Build stage: compile TypeScript ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# --- Runtime stage: prod deps + compiled output only ---
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# SEC-6: Run as non-root to limit blast radius of any RCE
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3001
CMD ["node", "dist/index.js"]
