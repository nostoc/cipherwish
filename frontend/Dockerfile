FROM node:22-bookworm-slim AS deps

# IMPORTANT: Node.js Version Maintenance
# This Dockerfile uses Node.js 24.13.0-slim, which was the latest LTS version at the time of writing.
# To ensure security and compatibility, regularly update the NODE_VERSION ARG to the latest LTS version.
ARG NODE_VERSION=24.13.0-slim
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

# Allow injecting the public API base URL at build time so Next.js can
# bake it into the client bundle (NEXT_PUBLIC_* variables are inlined
# at build time). Provide this as a build-arg when building the image:
# `docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://... .`
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