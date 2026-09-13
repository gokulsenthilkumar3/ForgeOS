# StackForge — Product Requirements Document (PRD)

## 1. Overview

**Product Name:** StackForge  
**Tagline:** One command. Full production stack.  
**Type:** CLI Scaffolding Tool (npm package)  
**Stack:** Node.js · TypeScript · Commander.js · Inquirer.js · Handlebars  
**Target Users:** Full-stack developers, TypeScript devs who repeatedly set up monorepos  

---

## 2. Problem Statement

Every new project starts with 2-3 hours of boilerplate: configuring Next.js, NestJS, Prisma, Docker, ESLint, Husky, GitHub Actions, environment files. StackForge does all of this in one interactive CLI command.

---

## 3. Features

### 3.1 Core (MVP)
- [ ] Interactive CLI prompts (project name, features to include)
- [ ] Generates monorepo: `apps/web` (Next.js) + `apps/api` (NestJS)
- [ ] `packages/shared` (shared types, utils)
- [ ] Supabase + Prisma ORM pre-configured
- [ ] Docker Compose (API + PostgreSQL + Redis)
- [ ] GitHub Actions: build + lint + deploy workflows
- [ ] `.env.example` files for all services
- [ ] Pre-wired ESLint + Prettier + Husky

### 3.2 Growth
- [ ] Premium templates: `--template stripe-saas`, `--template auth-starter`
- [ ] Plugin system (add Sentry, Resend, Cloudinary with one flag)
- [ ] Vercel + Render auto-deploy config generation
- [ ] `stackforge add <feature>` (add Redis to existing project)

---

## 4. CLI Flow

```
$ npx stackforge init

┌───────────────────────────────────────┐
│  ⚡ StackForge v1.0.0                  │
│  Scaffold a production monorepo       │
└───────────────────────────────────────┘

? Project name: my-saas-app
? Frontend framework: Next.js 14
? Backend framework: NestJS
? Database: Supabase (PostgreSQL)
? Include Redis? Yes
? Include Docker Compose? Yes
? Include GitHub Actions? Yes
? Deployment target: Vercel + Render

✔ Generating project structure...
✔ Installing dependencies...
✔ Configuring environment files...
✔ Setting up GitHub Actions...
✔ Done! Run: cd my-saas-app && pnpm dev
```

---

## 5. Generated Project Structure

```
my-saas-app/
├── apps/
│   ├── web/                    # Next.js 14
│   │   ├── src/app/
│   │   ├── next.config.ts
│   │   └── .env.example
│   └── api/                    # NestJS
│       ├── src/
│       ├── prisma/schema.prisma
│       └── .env.example
├── packages/
│   ├── shared/                 # Shared types
│   └── config/                 # Shared ESLint/TS config
├── docker-compose.yml
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── .husky/
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 6. Tech Stack

| Layer | Technology |
|-------|------------|
| CLI Framework | Commander.js |
| Interactive Prompts | Inquirer.js |
| Templating | Handlebars |
| Package Manager | pnpm (monorepo) |
| Monorepo Build | Turborepo |
| Distribution | npm package (`npx stackforge`) |

---

## 7. Monetization

| Tier | Price | Details |
|------|-------|---------|
| Open Source Core | Free | Basic Next.js + NestJS + Supabase scaffold |
| Premium Templates | $9 one-time | Stripe SaaS starter, Auth starter, Admin dashboard |
| Team License | $49/year | Unlimited premium templates + priority support |

---

## 8. Milestones

| Week | Deliverable |
|------|-------------|
| 1 | CLI init + Inquirer prompts |
| 2 | Handlebars template generation |
| 3 | Docker Compose + GitHub Actions templates |
| 4 | npm publish + README |
| 5 | Vercel + Render deploy config |
| 6 | Plugin system + premium templates |
