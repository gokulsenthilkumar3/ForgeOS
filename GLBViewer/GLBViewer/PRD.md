# GLBViewer — Product Requirements Document (PRD)

## 1. Overview

**Product Name:** GLBViewer  
**Tagline:** Upload once. Share forever. In 3D.  
**Type:** Browser-Based 3D File Viewer & Sharing Platform  
**Stack:** React · Three.js · React Three Fiber · Supabase Storage · TypeScript  
**Target Users:** 3D artists, game developers, CAD engineers, product designers, architects  

---

## 2. Problem Statement

Sharing a .glb or .gltf 3D model requires the recipient to have Blender, Unity, or specialized software. There’s no quick “Google Drive for 3D” — upload a file, get a link, anyone can view it in the browser with lighting, animations, and material controls.

---

## 3. Features

### 3.1 Core (MVP)
- [ ] Drag-and-drop upload (.glb, .gltf, .obj)
- [ ] Three.js viewer: orbit controls, zoom, pan
- [ ] Environment lighting (HDRI presets: studio, outdoor, neutral)
- [ ] Animation playback (play/pause/seek for animated models)
- [ ] UUID-based shareable URL (`/view/:uuid`)
- [ ] Supabase Storage backend (30-day expiry on free)
- [ ] Mobile-responsive viewer

### 3.2 Growth
- [ ] Morph target sliders (for blend shapes)
- [ ] Wireframe / normal / texture toggle
- [ ] Screenshot export (PNG of current view)
- [ ] Embed code generator (`<iframe>` for websites)
- [ ] Private link with password protection
- [ ] Collections (group multiple models)
- [ ] Account + model library management

---

## 4. Architecture

```
  User Browser
  │
  │ 1. Upload .glb file
  ▼
┌───────────────────────────────┐
│  React Upload Component           │
│  — file validation (size, type)   │
│  — progress bar                   │
└───────────┬───────────────────┘
           │ Supabase Storage SDK
           ▼
┌───────────────────────────────┐
│  Supabase Storage                  │
│  Bucket: models/                   │
│  — path: {uuid}/{filename}.glb    │
│  — signed URL (30-day expiry)     │
└───────────┬───────────────────┘
           │
           ▼
┌───────────────────────────────┐
│  Supabase DB (models table)        │
│  — uuid, filename, storage_path   │
│  — user_id, created_at, expiry    │
└───────────┬───────────────────┘
           │
           ▼
┌───────────────────────────────┐
│  Three.js Viewer (/view/:uuid)     │
│  React Three Fiber + Drei          │
│  — OrbitControls                  │
│  — Environment (HDRI)             │
│  — AnimationMixer                 │
│  — MorphTargetInfluences          │
│  — leva.js controls panel         │
└───────────────────────────────┘
```

---

## 5. Database Schema

```sql
models (
  id uuid PK,
  uuid varchar(36) UNIQUE,
  user_id uuid FK,
  filename varchar(255),
  storage_path text,
  file_size_kb integer,
  format varchar(10),          -- glb | gltf | obj
  has_animations boolean,
  has_morph_targets boolean,
  is_public boolean,
  password_hash text,          -- null if no password
  view_count integer,
  expires_at timestamptz,
  created_at timestamptz
)
```

---

## 6. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| 3D Engine | Three.js + React Three Fiber + @react-three/drei |
| Controls UI | leva.js |
| Storage | Supabase Storage |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (optional for sharing) |
| Deployment | Vercel |

---

## 7. Monetization

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 5 uploads/mo, 30-day expiry, 50MB per file |
| Pro | $8/mo | Unlimited uploads, permanent links, 500MB per file |
| Studio | $20/mo | Private links, password protection, embed codes, collections |

---

## 8. Milestones

| Week | Deliverable |
|------|-------------|
| 1–2 | Upload flow + Supabase Storage + UUID URL |
| 3–4 | Three.js viewer with orbit controls + HDRI |
| 5 | Animation playback + morph target sliders |
| 6 | Mobile responsive + share button |
| 7 | Embed code generator + iframe support |
| 8 | Auth + model library + expiry management |
