# 1. Move the ARG to the very top before any FROM instructions
ARG NODE_VERSION=24.13.0-slim

FROM node:22-bookworm-slim AS deps
ARG NEXT_PUBLIC_API_BASE_URL

FROM node:${NODE_VERSION} AS dependencies
# Set working directory
WORKDIR /app

COPY package*.json ./
RUN npm install

FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Allow injecting the public API base URL at build time
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]