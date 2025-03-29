# Stage 1: Build the source code
FROM node:22.14.0-alpine3.21 AS build_src
WORKDIR /app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

COPY . .

# Install dependencies and build the project
RUN corepack enable yarn
RUN yarn install --immutable
RUN yarn build

# Stage 2: Build the dependencies (only production dependencies)
FROM node:22.14.0-alpine3.21 AS build_deps
WORKDIR /app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

ENV NODE_ENV=production

# Copy ./build files from the previous stage
COPY --from=build_src /app/dist ./dist
COPY --from=build_src /app/package.json ./
COPY --from=build_src /app/yarn.lock ./  

# Ensure only production dependencies are installed
RUN corepack enable yarn
ENV YARN_ENABLE_IMMUTABLE_INSTALLS=false
RUN yarn install --immutable --mode=skip-build
RUN yarn cache clean --all

# Stage 3: Create the final image
FROM node:22.14.0-alpine3.21
WORKDIR /app

# Copy files from the previous build stage
COPY --from=build_deps /app .

# Use a non-root user if possible
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENTRYPOINT ["node", "./dist/index.mjs"]