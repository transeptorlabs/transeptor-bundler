# We use a multi-stage build approach to first build the app using Webpack in a temporary builder image (builder stage). Then, we copy the built files and the minimal set of necessary dependencies to a new image that will be used for running the app (final stage).
FROM node:18.0.0-alpine as builder
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

WORKDIR /app

COPY package*.json ./

# Copy the bundler source code from the host machine to the container
COPY ./packages/bundler /app/packages/bundler

RUN npm ci

RUN npm run build

# Use a minimal base image for running the app
FROM node:18.0.0-alpine as run
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

WORKDIR /app-run

COPY --from=builder /app/packages/bundler/dist /app-run/packages/bundler/dist
COPY --from=builder /app/packages/bundler/package.json /app-run/packages/bundler
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production

# Cleanup Temp Files and Cache
RUN npm cache clean --force

ENV NODE_OPTIONS=--experimental-specifier-resolution=node

ENTRYPOINT ["node", "--experimental-specifier-resolution=node", "./packages/bundler/dist/bundler.js"]
