FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/security/package.json packages/security/package.json
RUN pnpm install --no-frozen-lockfile
COPY apps/api apps/api
COPY packages/contracts packages/contracts
COPY packages/security packages/security
RUN pnpm --filter @forgeos/api build
CMD ["node", "apps/api/dist/main.js"]
