# Stage 1: Build the source code
FROM node:20-alpine3.18 AS build_src
WORKDIR /app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

COPY . .

# Install dependencies and build the project
RUN yarn install
RUN yarn build

# Stage 2: Build the dependencies
FROM node:20-alpine3.18 AS build_deps
WORKDIR /app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

ENV NODE_ENV=production

# Copy ./build files from the previous stage
COPY --from=build_src /app/dist ./dist
COPY --from=build_src /app/package.json ./

# Install production dependencies
RUN yarn install --frozen-lockfile --production
RUN yarn cache clean --all

# Stage 3: Create the final image
FROM node:20-alpine3.18
WORKDIR /app

# Copy files from the previous build stage
COPY --from=build_deps /app .

# Use a non-root user if possible
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENTRYPOINT ["node", "./dist/index.mjs"]