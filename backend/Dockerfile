FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production

# Default runtime environment variables. These provide sensible defaults for
# local testing but should be overridden in production via your deploy UI
# (Dockploy) or container runtime environment settings. Do NOT store
# production secrets (like real MongoDB credentials) directly in this file.
ENV PORT=5000
ENV FRONTEND_ORIGIN=https://cipherwish.internalbuildtools.online
# Leave empty by default; set to your MongoDB connection string in the
# deployment environment rather than hardcoding here.
ENV MONGODB_URI=

EXPOSE 5000

CMD ["npm", "start"]