# Use Node 22 on Alpine to build static frontend assets
FROM node:22-alpine AS builder

# Set build working directory
WORKDIR /app

# Copy dependency manifests first for better cache reuse
COPY package*.json ./
# Install exact dependencies from lockfile
RUN npm ci

# Copy full frontend source
COPY . .
# Build production static files into dist/
RUN npm run build

# Use lightweight Nginx image to serve built static files
FROM nginx:1.27-alpine AS runner

# Replace default Nginx site config with app config (SPA fallback, caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built frontend output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Document HTTP port
EXPOSE 80

# Start Nginx in foreground (required for containers)
CMD ["nginx", "-g", "daemon off;"]
