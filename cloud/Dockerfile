# syntax=docker/dockerfile:1
# Multi-stage build for the World Weather Node.js/Express API.
# Build CONTEXT is the backend/ folder. Build from the repo root with:
#   docker build -f cloud/Dockerfile -t weatherapplication-api backend/
# The React SPA is built + deployed separately (S3/CloudFront or GitHub Pages),
# not in this image.

FROM node:22-alpine AS build
WORKDIR /src

# Install production dependencies first (better layer caching).
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Bring in the pruned production node_modules and the application source.
COPY --from=build /src/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# App Runner / load balancers terminate TLS at the edge; the app serves HTTP.
ENV PORT=8080
EXPOSE 8080

# MongoDB connection is provided at runtime (env). Without it the API degrades
# gracefully to the bundled in-memory country seed.
#   ENV MONGODB_URI=mongodb+srv://...
#   ENV CORS_ALLOWED_ORIGINS=https://app.example.com

# Run as the node image's built-in non-root user.
USER node

CMD ["node", "src/server.js"]
