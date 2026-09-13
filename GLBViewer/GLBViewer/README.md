# GLBViewer 🎮

> Upload any `.glb`, `.gltf`, or `.obj` 3D file — get an instant shareable Three.js-powered viewer link.

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## What is GLBViewer?

GLBViewer lets you drag-and-drop a 3D model file, instantly renders it in a Three.js scene, and gives you a **shareable link** — no software install required. Perfect for 3D artists, game devs, and CAD engineers who need to share models quickly.

## Features

- 📤 **Drag & drop upload** — `.glb`, `.gltf`, `.obj` support
- 🔗 **Shareable URL** — UUID-based link valid for 30 days (free)
- 🎥 **Animation playback** — play/pause/scrub timeline
- 🎭 **Morph target sliders** — control blend shapes in real time
- 💡 **Lighting controls** — HDRI, ambient, directional
- 📷 **Screenshot export** — capture the current view as PNG
- 📌 **Embed support** — copy `<iframe>` code for any site

## Architecture

```
┌─────────────────────────────────────────────┐
│                React App (Vite)                │
│   Drag & Drop → Three.js Canvas → Controls UI  │
└──────────────────┬─────────────────────────┘
                   │ Upload file blob
┌──────────────────▼─────────────────────────┐
│           Supabase Storage                    │
│   bucket: models/ → UUID-keyed files           │
└──────────────────┬─────────────────────────┘
                   │ Signed URL
┌──────────────────▼─────────────────────────┐
│        Viewer Page (/view/:uuid)              │
│   Loads model → Three.js scene → Share link   │
└─────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| 3D Engine | Three.js, React Three Fiber, @react-three/drei |
| UI Controls | leva.js (lighting, morph sliders) |
| Storage | Supabase Storage |
| Database | Supabase PostgreSQL (model metadata) |
| Deploy | Vercel |

## Folder Structure

```
GLBViewer/
├── src/
│   ├── components/
│   │   ├── DropZone.tsx         # Drag & drop upload UI
│   │   ├── ModelViewer.tsx      # Three.js canvas
│   │   ├── ControlPanel.tsx     # Leva controls
│   │   ├── AnimationBar.tsx     # Timeline scrubber
│   │   └── ShareModal.tsx       # Copy link + iframe embed
│   ├── pages/
│   │   ├── Home.tsx             # Upload page
│   │   └── View.tsx             # /view/:uuid viewer
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   └── upload.ts            # File upload handler
│   └── main.tsx
├── public/
├── supabase/
│   └── migrations/
│       └── 001_models.sql
├── .env.example
└── README.md
```

## Quick Start

```bash
git clone https://github.com/gokulsenthilkumar3/GLBViewer
cd GLBViewer
npm install
cp .env.example .env   # Add Supabase credentials
npm run dev
```

## Business Model

| Plan | Price | Limits |
|---|---|---|
| Free | $0 | 5 uploads/mo, 30-day expiry, public only |
| Pro | $8/mo | Unlimited uploads, 1-year expiry, private links |
| Studio | $20/mo | Custom branding, team access, embed analytics |

## Roadmap

- [ ] AR viewer (WebXR)
- [ ] Side-by-side model compare
- [ ] Model metadata inspector (vertex count, textures)
- [ ] Export to USDZ (Apple AR Quick Look)
- [ ] Password-protected share links

## License

MIT © [Gokul Senthilkumar](https://github.com/gokulsenthilkumar3)
