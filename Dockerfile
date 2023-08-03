# We use a multi-stage build approach to first build the app using Webpack in a temporary builder image (builder stage). Then, we copy the built files and the minimal set of necessary dependencies to a new image that will be used for running the app (final stage).
FROM node:18.0.0-alpine as builder
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

WORKDIR /app

COPY ./package/bundler/package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Use a minimal base image for running the app
FROM node:18.0.0-alpine as run
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production

ENTRYPOINT ["node","./dist/bundler.js"]