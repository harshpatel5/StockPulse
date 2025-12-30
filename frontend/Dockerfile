FROM node:22-alpine AS builder

WORKDIR /app

# Copy only package files first (this layer is cached)
COPY package.json package-lock.json ./

# Install dependencies (cached unless package.json changes)
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public
COPY index.html vite.config.js ./

# Build arg for API URL (baked into the build)
# Default to localhost:5000/api for Docker setup
ARG VITE_API_BASE_URL=http://localhost:5000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the production bundle
RUN npm run build

# Production stage - serve with lightweight server
FROM node:22-alpine

WORKDIR /app

# Install serve to host static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]