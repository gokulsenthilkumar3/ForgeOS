# StackForge ⚡

> Scaffold a production-ready Next.js + NestJS + Supabase + Redis monorepo in one command.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![CLI](https://img.shields.io/badge/CLI-Tool-orange)

## What is StackForge?

StackForge is a CLI tool that generates a fully wired production monorepo in seconds. Stop spending hours bootstrapping — run one command and get a complete `apps/web` + `apps/api` + `packages/shared` setup with Docker Compose and GitHub Actions pre-configured.

## Usage

```bash
npx stackforge init my-project
```

Then answer the interactive prompts:
```
? Project name: my-project
? Frontend framework: Next.js 14
? Backend framework: NestJS
? Database: Supabase (PostgreSQL)
? Cache: Redis
? Include Docker Compose? Yes
? Include GitHub Actions CI/CD? Yes

✔ Scaffolding monorepo...
✔ Installing dependencies...
✔ Done! cd my-project && npm run dev
```

## What Gets Generated

```
my-project/
├── apps/
│   ├── web/                   # Next.js 14 + Tailwind CSS
│   └── api/                   # NestJS + Prisma
├── packages/
│   └── shared/                # Shared TypeScript types
├── docker-compose.yml       # PostgreSQL + Redis + services
├── .github/
│   └── workflows/
│       ├── ci.yml             # Build + lint + test
│       └── deploy.yml         # Vercel + Render deploy
├── .env.example
└── turbo.json               # Turborepo config
```

## Architecture

```
CLI (Commander.js + Inquirer.js)
        │
        ▼
 Template Engine (Handlebars)
        │
        ▼
 File Generator → Output Directory
        │
        ▼
 npm install → git init → Ready!
```

## Tech Stack

| Layer | Technology |
|---|---|
| CLI Framework | Commander.js + Inquirer.js |
| Templates | Handlebars.js |
| Package Manager | npm / pnpm |
| Monorepo | Turborepo |
| Generated Stack | Next.js, NestJS, Prisma, Supabase, Redis |

## Templates Available

| Template | Stack |
|---|---|
| `default` | Next.js + NestJS + Supabase + Redis |
| `minimal` | Next.js + Express + SQLite |
| `saas` | Next.js + NestJS + Stripe + Supabase Auth |
| `api-only` | NestJS + Prisma + PostgreSQL |

## Business Model

- **Core CLI** — Free & open-source (star growth = reputation)
- **Premium Templates** — $9 one-time per template (SaaS starter, multi-tenant, etc.)
- **Enterprise** — Custom templates + support contracts

## Roadmap

- [ ] pnpm workspace support
- [ ] Bun support
- [ ] Mobile (React Native + Expo) template
- [ ] VS Code extension for visual scaffolding
- [ ] Template marketplace

## License

MIT © [Gokul Senthilkumar](https://github.com/gokulsenthilkumar3)
