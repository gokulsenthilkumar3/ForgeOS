# CommitCraft 🤖

> AI-powered Git commit message generator — paste a diff, get a perfect Conventional Commit message instantly.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)

## What is CommitCraft?

Stop spending time crafting commit messages manually. Paste your `git diff` output, select the scope and type, and CommitCraft generates a clean [Conventional Commits](https://www.conventionalcommits.org/) message in seconds.

## Features

- 📝 **Conventional Commits spec** — `feat:`, `fix:`, `chore:`, `refactor:`, etc.
- 🤖 **AI-powered** — OpenAI or Ollama (local, private)
- 🎯 **Custom scopes** — define your own scope list
- 📜 **Commit history** — recent messages saved locally
- 🔗 **Web app** + **VS Code Extension** (coming soon)
- 🔐 **BYOK** — bring your own OpenAI API key (stored in localStorage only)

## Usage

### Web App
```
1. Paste your git diff
2. Select commit type (feat / fix / chore...)
3. Click Generate
4. Copy the message
```

### CLI (coming soon)
```bash
git diff --staged | npx commitcraft
# Output: feat(auth): add JWT refresh token rotation
```

## Architecture

```
React App (Vite)
      │
      ├─ DiffInput → OpenAI API (user key)
      ├─ TypeSelector (feat/fix/chore/...)
      ├─ ScopeInput (custom scopes)
      └─ LocalStorage (history + API key)

CLI (Node.js)
      │
      └─ stdin diff → OpenAI → stdout message
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| AI | OpenAI API (`gpt-4o-mini`) or Ollama local |
| CLI | Node.js + Commander.js |
| Deploy | Vercel / GitHub Pages |

## Folder Structure

```
CommitCraft/
├── src/
│   ├── components/
│   │   ├── DiffInput.tsx         # Paste diff area
│   │   ├── TypeSelector.tsx      # feat/fix/chore dropdown
│   │   ├── OutputMessage.tsx     # Generated message + copy
│   │   └── HistoryPanel.tsx      # Recent commits
│   ├── lib/
│   │   ├── generate.ts           # OpenAI call
│   │   └── storage.ts            # LocalStorage history
│   └── App.tsx
├── cli/
│   └── index.ts              # CLI entry point
├── public/
└── README.md
```

## Quick Start

```bash
git clone https://github.com/gokulsenthilkumar3/CommitCraft
cd CommitCraft
npm install
npm run dev
# Open http://localhost:5173
# Enter your OpenAI API key on first use
```

## Business Model

| Plan | Price | Features |
|---|---|---|
| Free web app | $0 | BYOK, full features, history |
| VS Code Extension | $4/mo | No BYOK needed, IDE integration, one-click commit |

## Roadmap

- [ ] CLI: `git diff --staged | npx commitcraft`
- [ ] VS Code Extension
- [ ] Ollama local model support
- [ ] Multi-commit batch generation
- [ ] GitHub PR description generator

## License

MIT © [Gokul Senthilkumar](https://github.com/gokulsenthilkumar3)
