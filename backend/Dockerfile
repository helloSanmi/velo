# Use Node 22 on Alpine as the build image (small + fast for CI)
FROM node:22-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests first for better Docker layer caching
COPY package*.json ./
# Install exact dependencies from lockfile
RUN npm ci

# Copy only files required to build backend
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client based on prisma/schema.prisma
RUN npm run prisma:generate
# Compile TypeScript into dist/
RUN npm run build
# Remove dev dependencies to keep runtime image smaller
RUN npm prune --omit=dev

# Start a clean runtime image
FROM node:22-alpine AS runner

# Mark environment as production
ENV NODE_ENV=production
# Set runtime working directory
WORKDIR /app

# Copy only runtime artifacts from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Document backend port
EXPOSE 4000

# Drop root privileges for safer runtime
USER node

# Start compiled backend server
CMD ["node", "dist/server.js"]
