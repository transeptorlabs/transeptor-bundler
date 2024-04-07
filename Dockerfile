# Stage 1: Build the source code
FROM node:20-alpine3.18 as build_src
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

# Copy the source code
COPY . .

# Install dependencies and build the project
RUN npm install
RUN npm run build

# Stage 2: Build the dependencies
FROM node:20-alpine3.18 as build_deps
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

# Copy ./build files from the previous stage
COPY --from=build_src /usr/app/ .

# Install production dependencies
RUN npm install --production --force

# Stage 3: Create the final image
FROM node:20-alpine3.18
WORKDIR /usr/app

# Copy files from the previous build stage
COPY --from=build_deps /usr/app .

ENTRYPOINT ["node", "./dist/cjs/src/index.js"]