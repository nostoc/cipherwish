# 1. Global ARG declaration
ARG NODE_VERSION=24.13.0-slim

# 2. Single 'deps' stage for installing dependencies
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# 3. Builder stage
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Copy the node_modules we just built in the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Declare the ARG *inside* the builder stage so we can use it
ARG NEXT_PUBLIC_API_BASE_URL

# Allow injecting the public API base URL at build time
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build

# 4. Runner stage (Alpine is fine here for a smaller final image size)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]