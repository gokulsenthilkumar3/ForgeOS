# RegexForge 🔍

> A developer-grade regex playground with live match highlighting, AI-powered explanation, multi-language support, and shareable links.

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?style=flat&logo=github)

## What is RegexForge?

RegexForge is the regex tool that actually helps you **understand** the pattern — not just match it. Write a regex, see live highlights, run test cases, get an AI explanation, and share the link with your team in seconds.

## Features

- ⚡ **Live match highlighting** — see matches update as you type
- 🧠 **AI Explain** — paste a regex, get a plain-English breakdown (bring your own OpenAI key)
- 🖼️ **Flavor support** — JavaScript, Python, Go
- 🧪 **Test case runner** — add multiple test strings, mark expected pass/fail
- 🔗 **Shareable links** — entire state encoded in URL query params
- 💾 **Saved collections** — store frequently used patterns (Pro)
- 🌐 **100% client-side** — no backend, deployable on GitHub Pages

## Architecture

```
React + TypeScript (Vite)
        │
        ├─ RegexEngine (browser-native JS RegExp)
        ├─ AI Explain (OpenAI API — optional BYOK)
        ├─ URL State (query params → shareable link)
        └─ LocalStorage (saved collections)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Regex Engine | Browser-native `RegExp` (JS), Pyodide (Python flavor) |
| AI Explain | OpenAI API (user-supplied key, stored in localStorage) |
| Sharing | URL-encoded state via `URLSearchParams` |
| Deploy | GitHub Pages / Vercel |

## Folder Structure

```
RegexForge/
├── src/
│   ├── components/
│   │   ├── RegexInput.tsx       # Pattern + flags input
│   │   ├── HighlightedText.tsx  # Live match viewer
│   │   ├── TestCaseRunner.tsx   # Test suite
│   │   ├── AIExplain.tsx        # AI breakdown panel
│   │   └── ShareButton.tsx      # Copy link button
│   ├── lib/
│   │   ├── regex.ts             # Match engine
│   │   ├── share.ts             # URL encode/decode
│   │   └── ai.ts                # OpenAI explain call
│   └── App.tsx
├── public/
└── README.md
```

## Quick Start

```bash
git clone https://github.com/gokulsenthilkumar3/RegexForge
cd RegexForge
npm install
npm run dev
```

## Business Model

| Plan | Price | Features |
|---|---|---|
| Free | $0 | Full playground, share links, AI explain (BYOK) |
| Pro | $3/mo | Saved collections, team sharing, no BYOK needed |

## Roadmap

- [ ] Python flavor via Pyodide (WASM)
- [ ] Go flavor via WASM
- [ ] Regex cheat sheet sidebar
- [ ] VS Code extension
- [ ] Import from curl / code snippet

## License

MIT © [Gokul Senthilkumar](https://github.com/gokulsenthilkumar3)
