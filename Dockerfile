FROM node:22-alpine AS builder

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare yarn@3.2.1 --activate
RUN yarn install --frozen-lockfile && yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4337

# Use a non-root user if possible
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENTRYPOINT ["node", "./dist/index.mjs"]