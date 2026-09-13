# PromptVault

PromptVault is a premium AI Prompt Management SPA built with React + Vite. It allows you to store, organize, search, and run AI prompts in a beautiful glassmorphism interface.

## 🚀 Live Demo

[https://gokulsenthilkumar3.github.io/PromptVault-UI/](https://gokulsenthilkumar3.github.io/PromptVault-UI/)

## ✨ Features

- **📁 Collections:** Color-coded sidebar folders for organizing prompts.
- **🏷️ Tags & Filters:** Multi-tag, model, collection, favorites, pinned, and rating filters.
- **⚡ Template Variables:** Auto-detection of `{{variable}}` and a live fill-in modal.
- **🚀 Quick Run:** Copy-to-clipboard and "Open in ChatGPT/Claude/Gemini" capabilities.
- **⭐ Favorites & Pins:** Star and pin prompts for quick access.
- **🔍 Fuzzy Search:** Powered by Fuse.js across title, content, description, and tags.
- **🕰️ Version History:** Every save creates a snapshot; one-click revert.
- **🤖 AI Model Tags:** Visual indicators for GPT-4o, Claude 3, Gemini 1.5, Llama 3, etc.
- **📦 Import/Export:** JSON backup with import preview.
- **📊 Analytics:** Recharts-powered line chart, pie chart, bar chart, and top-prompts leaderboard.
- **⌘K Command Palette:** Global command palette for quick navigation and searching.

## 🛠️ Tech Stack

- **React 18**
- **Vite 5**
- **Zustand** (with localStorage persistence)
- **React Router v6** (using HashRouter for GitHub Pages compatibility)
- **Fuse.js** (Fuzzy searching)
- **Recharts** (Analytics)
- **Lucide React** (Icons)
- **react-hot-toast** (Notifications)

## 🎨 Design System

- **Dark glassmorphism UI**
- **Electric violet accent** (`#8b5cf6`)
- **Inter font** (Google Fonts)
- **Animated background orbs** and smooth micro-animations

## 💻 Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/gokulsenthilkumar3/PromptVault-UI.git
   ```
2. Navigate to the project directory:
   ```bash
   cd PromptVault-UI
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🚀 Deployment

This project is configured to deploy to GitHub Pages.

To deploy a new version:
```bash
npm run deploy
```
