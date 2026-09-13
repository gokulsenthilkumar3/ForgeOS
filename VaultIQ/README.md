# VaultIQ: Premium Password Manager

![VaultIQ Banner](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20|%20NestJS%20|%20SQLite-blue?style=for-the-badge)

**VaultIQ** has been reimagined as a premium, enterprise-grade password manager that combines military-grade security with an intuitive, modern user experience. It provides zero-knowledge encryption, a comprehensive security scoring system, and a suite of tools for protecting your digital identity.

---

## 🚀 Key Features

### 🛡 Zero-Knowledge Architecture

VaultIQ employs military-grade encryption (PBKDF2 + AES-256-GCM). Your master password and encryption keys never leave your browser. The server only stores and transmits fully encrypted data blobs, ensuring that no one, not even system administrators, can access your data.

### 📊 Real-Time Security Score

Get immediate feedback on the health of your vault. The system actively scans for weak, reused, or stale passwords and identifies accounts lacking Two-Factor Authentication (2FA).

### 🔑 Cryptographic Generator

Generate highly secure passwords, passphrases, PINs, and usernames using cryptographically secure random number generators directly in the browser.

### 📱 Modern User Experience

A beautiful, highly responsive interface featuring deep navy and vibrant teal aesthetics, glassmorphism elements, and smooth micro-animations.

---

## 🛠 Technology Stack

### Frontend

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Vanilla CSS + Glassmorphism Design System
- **State & Context**: React Context API (AuthContext, VaultContext)
- **Crypto**: Web Crypto API (AES-256-GCM, PBKDF2)

### Backend (Microservices)

- **Core**: NestJS (Node.js)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT, bcrypt for server-side auth logic

---

## 📦 Project Structure

```text
├── frontend/             # Next.js Application
│   ├── app/              # App Router Pages (login, dashboard, vault, etc.)
│   ├── components/       # UI Components (Shell, PasswordStrengthMeter)
│   ├── context/          # State Management (Auth, Vault)
│   └── lib/              # Client-side encryption logic
├── backend/              # NestJS Backend
│   ├── src/
│   │   ├── auth/         # Authentication and registration logic
│   │   ├── users/        # User management 
│   │   └── vault/        # Encrypted entry storage API
│   └── prisma/           # Database Schema (SQLite)
└── README.md             # Project documentation
```

---

## 🚦 Getting Started

1. **Clone the Repo**:

   ```bash
   git clone https://github.com/gokulsenthilkumar3/VaultIQ.git
   ```

2. **Environment Setup**:

   Create a `.env` file in the `backend/` directory:

   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="super-secret-jwt-key"
   ```

3. **Install Dependencies**:

   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

4. **Initialize Database**:

   ```bash
   cd backend
   npx prisma db push --force-reset
   npx ts-node prisma/seed.ts
   ```

5. **Run Development Servers**:

   ```bash
   # In separate terminals
   npm run dev (frontend)
   npm run start:dev (backend)
   ```

---

## 📄 License

Enterprise Proprietary. Built with ⚡ by **VaultIQ Team**.
