# CraftCV 📄

> Browser-only resume and CV builder — no login, no backend, your data never leaves the browser.

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?style=flat&logo=github)

## What is CraftCV?

CraftCV is a clean, distraction-free resume builder that runs entirely in your browser. Fill in your details, pick a template, preview in real time, and export to PDF — all without creating an account.

## Features

- 📄 **Multiple professional templates** — Classic, Modern, Minimal, Developer
- 👁️ **Live preview** — see changes instantly as you type
- 📅 **PDF export** — high-quality, print-ready output
- 💾 **Auto-save** — data persisted in localStorage
- 🔒 **Privacy-first** — zero network requests, 100% offline capable
- 🎲 **JSON-schema driven** — swap templates without re-entering data
- 🌐 **No login required** — open and start building

## Architecture

```
React + TypeScript (Vite)
        │
        ├─ Form Engine (React Hook Form)
        ├─ Template Renderer (CSS-in-JS per template)
        ├─ PDF Export (react-pdf / jsPDF)
        └─ LocalStorage (auto-save resume data)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Forms | React Hook Form + Zod validation |
| PDF Export | react-pdf (server-free) |
| Storage | LocalStorage only |
| Deploy | GitHub Pages / Vercel |

## Folder Structure

```
CraftCV/
├── src/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── PersonalInfo.tsx
│   │   │   ├── ExperienceSection.tsx
│   │   │   ├── EducationSection.tsx
│   │   │   └── SkillsSection.tsx
│   │   ├── Preview/
│   │   │   ├── ClassicTemplate.tsx
│   │   │   ├── ModernTemplate.tsx
│   │   │   └── DeveloperTemplate.tsx
│   │   └── ExportButton.tsx
│   ├── lib/
│   │   ├── storage.ts        # LocalStorage read/write
│   │   └── pdf.ts            # PDF generation
│   ├── types/
│   │   └── resume.ts         # Resume data schema
│   └── App.tsx
├── public/
└── README.md
```

## Quick Start

```bash
git clone https://github.com/gokulsenthilkumar3/CraftCV
cd CraftCV
npm install
npm run dev
```

## Business Model

| Plan | Price | Features |
|---|---|---|
| Free | $0 | 2 templates, PDF export, localStorage save |
| Pro Templates | $2 one-time | Per premium template (Modern, Developer, etc.) |

## Roadmap

- [ ] AI-assisted bullet point writer
- [ ] Import from LinkedIn PDF
- [ ] Multi-language CV support
- [ ] ATS score checker
- [ ] Dark mode templates

## License

MIT © [Gokul Senthilkumar](https://github.com/gokulsenthilkumar3)
