FROM node:20-alpine
WORKDIR /app
RUN corepack enable
ENV FORGEOS_API_INTERNAL_URL=http://api:4000
ENV FORGEOS_MATHSHIELD_INTERNAL_URL=http://mathshield:4001
ENV FORGEOS_PULSEWATCH_INTERNAL_URL=http://pulsewatch:4002
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo build --filter=@forgeos/web...
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@forgeos/web", "start"]
