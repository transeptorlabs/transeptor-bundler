FROM node:22-alpine AS builder

WORKDIR /app

COPY . .

ENV NODE_ENV=production
RUN corepack enable && corepack prepare yarn@4.7.0 --activate
RUN yarn install --frozen-lockfile --immutable && yarn build

FROM node:22-alpine AS deps
WORKDIR /app
COPY . .

RUN corepack enable && corepack prepare yarn@4.7.0 --activate
RUN yarn workspaces focus --production --all

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 4337

# Create user and group first
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create logs directory and audit.log file with correct permissions
RUN mkdir -p /app/logs && \
    touch /app/logs/audit.log && \
    chown -R appuser:appgroup /app/logs && \
    chmod 755 /app/logs && \
    chmod 644 /app/logs/audit.log

USER appuser

ENTRYPOINT ["node", "./dist/cli.mjs"]