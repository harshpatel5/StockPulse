FROM node:22-alpine

WORKDIR /app

# Copy only package files first (this layer is cached)
COPY package.json package-lock.json ./

# Install dependencies (cached unless package.json changes)
RUN npm ci

# Copy source code (changes don't invalidate dependency cache)
COPY src ./src
COPY public ./public
COPY index.html vite.config.js ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]