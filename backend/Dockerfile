# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for node-gyp if any (e.g. bcrypt)
RUN apk add --no-cache python3 make g++

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install runtime dependencies for native modules
RUN apk add --no-cache libstdc++

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci --omit=dev

# Copy compiled JavaScript output and generated Prisma client from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
