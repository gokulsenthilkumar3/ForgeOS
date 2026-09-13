# PRD — PromptVault

## Overview
PromptVault is a Git-like version control system for LLM prompts. It lets developers track, diff, branch, rollback, and A/B test prompts across OpenAI, Anthropic, and Gemini — the missing developer toolchain for the AI-first era.

---

## Problem Statement
AI teams lose track of prompt changes, have no way to diff versions, can't rollback to a known-good prompt, and have no structured way to A/B test prompt performance. There is no "GitHub for prompts".

---

## Goals
- Version every prompt change with a full diff history
- Support branching prompts (e.g., `main`, `experiment/tone-v2`)
- A/B test two prompt versions and compare results side-by-side
- Multi-provider support: OpenAI, Anthropic, Gemini
- Team collaboration with roles (viewer, editor, admin)

---

## Non-Goals
- Not a prompt marketplace
- Not a full LLM playground (that's ProbeAI)
- No model fine-tuning

---

## Target Users
- AI engineers and prompt engineers
- Full-stack devs integrating LLMs into products
- Solo developers building AI-powered apps

---

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | NestJS REST API |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (magic link + OAuth) |
| LLM Bridge | OpenAI SDK, Anthropic SDK, Gemini SDK |
| Deployment | Vercel (frontend), Render (backend) |

---

## Database Schema
```
prompts (id, name, description, created_by, created_at)
prompt_versions (id, prompt_id, version_number, content, model, temperature, created_at)
prompt_branches (id, prompt_id, branch_name, head_version_id)
ab_tests (id, prompt_id, version_a_id, version_b_id, results_json, created_at)
teams (id, name, owner_id)
team_members (team_id, user_id, role)
```

---

## Core Features

### v1.0 (MVP)
- [ ] Prompt creation and editing
- [ ] Version history with full diff viewer
- [ ] Branch creation and switching
- [ ] Rollback to any previous version
- [ ] Multi-provider API key management

### v1.1
- [ ] A/B test runner with side-by-side output comparison
- [ ] Prompt tagging and search
- [ ] Export prompt history as JSON

### v2.0
- [ ] Team workspaces with role-based access
- [ ] GitHub Actions integration (test prompts on PR)
- [ ] Prompt quality scoring (latency, token cost, relevance)

---

## Business Model
| Plan | Price | Limits |
|------|-------|--------|
| Free | $0 | 50 prompts, 3 branches, solo only |
| Pro | $12/mo | Unlimited prompts, teams up to 5, A/B testing |
| Team | $29/mo | Unlimited everything, SSO, audit logs |

**Revenue levers:** Monthly subscriptions, annual discount (20%), enterprise custom pricing.

---

## Success Metrics
- 500 signups in first 3 months
- 15% free → paid conversion rate
- DAU/MAU ratio > 40%
- Avg. prompts per active user > 10

---

## Risks
| Risk | Mitigation |
|------|------------|
| LLM API costs for A/B testing | User brings own API key (BYOK) |
| Competition from LangSmith | Focus on simplicity and Git mental model |
| Low retention | Weekly digest email of prompt performance |
