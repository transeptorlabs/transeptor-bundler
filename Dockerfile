# Stage 1: Build the source code
FROM node:18-alpine as build_src
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

# Copy all files from the current directory to the container's working directory
COPY . .

# Install dependencies without generating a package-lock.json
# RUN npm install --no-package-lock
RUN npm install

# Build the project
RUN npm run build

# Install production dependencies without generating a package-lock.json
# RUN npm install --no-package-lock --production

# Stage 2: Build the dependencies
FROM node:18-alpine as build_deps
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

# Copy files from the previous build stage
COPY --from=build_src /usr/app .

# Install production dependencies without generating a package-lock.json
# RUN npm install --no-package-lock --production --force
RUN npm install

# Stage 3: Create the final image
FROM node:18-alpine
WORKDIR /usr/app

# Copy files from the previous build stage
COPY --from=build_deps /usr/app .

ENTRYPOINT ["node", "./packages/cli/lib/src/cli.js"]