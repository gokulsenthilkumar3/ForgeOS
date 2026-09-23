FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo build --filter=@forgeos/api...
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]
